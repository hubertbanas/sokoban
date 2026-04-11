#!/usr/bin/env bash

# ==============================================================================
# Local Release Builder
# ==============================================================================
#
# Purpose
# -------
# Build Sokoban release artifacts locally in a repeatable, containerized flow.
# The script supports full builds and narrow builds such as:
# - Linux desktop arm64 only
# - Android APK only
# - Android AAB only
#
# Implementation
# --------------
# - Uses Dockerized tooling so host setup stays minimal.
# - Uses node:24-alpine for dependency install, web build, and tests.
# - Uses node:24-bookworm (privileged) for AppImage/Flatpak packaging.
# - Uses reactnativecommunity/react-native-android for Android release builds.
# - Runs step-aware preflight checks for repository location, host binaries,
#   Docker availability/permissions, and Android signing env configuration.
# - Preflight may pull missing Docker images on first run.
# - Preserves host file ownership after containerized build steps.
# ==============================================================================

set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd -P)"

NODE_ALPINE_IMAGE="node:24-alpine"
NODE_BOOKWORM_IMAGE="node:24-bookworm"
ANDROID_IMAGE="reactnativecommunity/react-native-android:latest"
ANDROID_ENV_FILE=".env.android-release"

STEPS_REQUESTED="all"
LINUX_TARGET="both"
LINUX_ARCH="both"
ANDROID_TARGET="both"
USE_SUDO_CHOWN=1

RUN_CLEAN=0
RUN_WEB=0
RUN_TESTS=0
RUN_APPIMAGE=0
RUN_FLATPAK=0
RUN_ANDROID=0
ANDROID_ENV_READY=0

HOST_UID="$(id -u)"
HOST_GID="$(id -g)"

usage() {
  cat <<EOF
Usage:
  ${SCRIPT_NAME} [options]

Build local release artifacts for Sokoban.

Options:
  -h, --help                      Show this help and exit.
  --steps <csv>                   Steps to run (comma-separated).
                                  Values: clean,web,test,appimage,flatpak,android,all
                                  Default: all
  --linux-target <value>          Linux desktop target filter.
                                  Values: appimage,flatpak,both
                                  Default: both
  --linux-arch <value>            Linux architecture for electron-builder.
                                  Values: x64,arm64,both
                                  Default: both
  --android-target <value>        Android output to build.
                                  Values: apk,aab,both
                                  Default: both
  --no-sudo-chown                 Skip sudo ownership normalization in clean step.

Preflight Validation:
  - Must run from repository root: ${REPO_ROOT}
  - Confirms host binaries needed by selected steps are executable
  - Confirms Docker daemon access and workspace mount permissions
  - Confirms required binaries exist in selected Docker images
  - May pull missing Docker images during preflight (first run can take time)
  - Validates Android signing variables in ${ANDROID_ENV_FILE} when Android is requested

Convenience Shortcuts:
  --appimage-only                 Same as: --steps appimage
  --flatpak-only                  Same as: --steps flatpak
  --apk-only                      Same as: --steps android --android-target apk
  --aab-only                      Same as: --steps android --android-target aab
  --linux-arm64                   Same as: --linux-arch arm64
  --linux-x64                     Same as: --linux-arch x64

Examples:
  ${SCRIPT_NAME}
  ${SCRIPT_NAME} --steps appimage,flatpak --linux-arch arm64
  ${SCRIPT_NAME} --flatpak-only --linux-arch x64
  ${SCRIPT_NAME} --apk-only
  ${SCRIPT_NAME} --steps clean,web,test
EOF
}

log() {
  printf '[build-releases] %s\n' "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

to_lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

validate_choice() {
  local label="$1"
  local value="$2"
  local allowed_csv="$3"
  local item
  local -a items

  IFS=',' read -r -a items <<< "$allowed_csv"
  for item in "${items[@]}"; do
    if [ "$value" = "$item" ]; then
      return 0
    fi
  done

  die "Invalid ${label}: ${value}. Allowed values: ${allowed_csv}"
}

configure_steps() {
  local step
  local raw
  local -a raw_steps

  if [ "$STEPS_REQUESTED" = "all" ]; then
    RUN_CLEAN=1
    RUN_WEB=1
    RUN_TESTS=1
    RUN_APPIMAGE=1
    RUN_FLATPAK=1
    RUN_ANDROID=1
    return
  fi

  IFS=',' read -r -a raw_steps <<< "$STEPS_REQUESTED"
  for raw in "${raw_steps[@]}"; do
    step="${raw//[[:space:]]/}"
    case "$step" in
      clean) RUN_CLEAN=1 ;;
      web) RUN_WEB=1 ;;
      test) RUN_TESTS=1 ;;
      appimage) RUN_APPIMAGE=1 ;;
      flatpak) RUN_FLATPAK=1 ;;
      android) RUN_ANDROID=1 ;;
      all)
        RUN_CLEAN=1
        RUN_WEB=1
        RUN_TESTS=1
        RUN_APPIMAGE=1
        RUN_FLATPAK=1
        RUN_ANDROID=1
        ;;
      "")
        ;;
      *)
        die "Unknown step in --steps: ${step}"
        ;;
    esac
  done

  if [ "$RUN_CLEAN" -eq 0 ] && [ "$RUN_WEB" -eq 0 ] && [ "$RUN_TESTS" -eq 0 ] && \
     [ "$RUN_APPIMAGE" -eq 0 ] && [ "$RUN_FLATPAK" -eq 0 ] && [ "$RUN_ANDROID" -eq 0 ]; then
    die "No runnable steps selected. Use --steps with at least one valid step."
  fi
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -h|--help)
        usage
        exit 0
        ;;
      --steps)
        [ "$#" -ge 2 ] || die "--steps requires a value"
        STEPS_REQUESTED="$(to_lower "$2")"
        shift 2
        ;;
      --linux-target)
        [ "$#" -ge 2 ] || die "--linux-target requires a value"
        LINUX_TARGET="$(to_lower "$2")"
        shift 2
        ;;
      --linux-arch)
        [ "$#" -ge 2 ] || die "--linux-arch requires a value"
        LINUX_ARCH="$(to_lower "$2")"
        shift 2
        ;;
      --android-target)
        [ "$#" -ge 2 ] || die "--android-target requires a value"
        ANDROID_TARGET="$(to_lower "$2")"
        shift 2
        ;;
      --no-sudo-chown)
        USE_SUDO_CHOWN=0
        shift
        ;;
      --appimage-only)
        STEPS_REQUESTED="appimage"
        shift
        ;;
      --flatpak-only)
        STEPS_REQUESTED="flatpak"
        shift
        ;;
      --apk-only)
        STEPS_REQUESTED="android"
        ANDROID_TARGET="apk"
        shift
        ;;
      --aab-only)
        STEPS_REQUESTED="android"
        ANDROID_TARGET="aab"
        shift
        ;;
      --linux-arm64)
        LINUX_ARCH="arm64"
        shift
        ;;
      --linux-x64)
        LINUX_ARCH="x64"
        shift
        ;;
      *)
        die "Unknown option: $1. Run ${SCRIPT_NAME} --help"
        ;;
    esac
  done

  validate_choice "linux target" "$LINUX_TARGET" "appimage,flatpak,both"
  validate_choice "linux arch" "$LINUX_ARCH" "x64,arm64,both"
  validate_choice "android target" "$ANDROID_TARGET" "apk,aab,both"

  configure_steps
}

docker_steps_selected() {
  if [ "$RUN_WEB" -eq 1 ] || [ "$RUN_TESTS" -eq 1 ] || [ "$RUN_APPIMAGE" -eq 1 ] || \
     [ "$RUN_FLATPAK" -eq 1 ] || [ "$RUN_ANDROID" -eq 1 ]; then
    return 0
  fi
  return 1
}

require_host_bin() {
  local bin="$1"
  local bin_path

  if ! bin_path="$(command -v "$bin" 2>/dev/null)"; then
    die "Required host binary '${bin}' was not found in PATH."
  fi

  if [ ! -x "$bin_path" ]; then
    die "Required host binary '${bin}' exists at '${bin_path}' but is not executable by the current user."
  fi
}

validate_host_bins_for_selected_steps() {
  local bin
  local -a host_bins=()

  if [ "$RUN_CLEAN" -eq 1 ]; then
    host_bins+=(rm chown)
  fi

  if [ "$RUN_APPIMAGE" -eq 1 ] || [ "$RUN_FLATPAK" -eq 1 ] || [ "$RUN_ANDROID" -eq 1 ]; then
    host_bins+=(ls)
  fi

  if [ "$RUN_ANDROID" -eq 1 ]; then
    host_bins+=(grep)
  fi

  if [ "$RUN_APPIMAGE" -eq 1 ] || [ "$RUN_FLATPAK" -eq 1 ] || [ "$RUN_ANDROID" -eq 1 ] || \
     [ "$RUN_WEB" -eq 1 ] || [ "$RUN_TESTS" -eq 1 ]; then
    host_bins+=(docker)
  fi

  for bin in "${host_bins[@]}"; do
    require_host_bin "$bin"
  done
}

validate_repo_root() {
  if [ "$(pwd -P)" != "$REPO_ROOT" ]; then
    die "Run ${SCRIPT_NAME} from repository root: cd '${REPO_ROOT}' && ./scripts/${SCRIPT_NAME}"
  fi

  [ -f package.json ] || die "Expected package.json in ${REPO_ROOT}. Are you in the Sokoban repository root?"
  [ -f scripts/build-releases.sh ] || die "Expected scripts/build-releases.sh in ${REPO_ROOT}. Repository layout looks unexpected."
}

validate_workspace_permissions() {
  if [ ! -w "$PWD" ]; then
    die "Current directory is not writable by uid:${HOST_UID} gid:${HOST_GID} (${PWD})."
  fi
}

validate_sudo_preconditions() {
  if [ "$RUN_CLEAN" -eq 0 ] || [ "$USE_SUDO_CHOWN" -eq 0 ] || [ "$HOST_UID" -eq 0 ]; then
    return
  fi

  if ! command -v sudo >/dev/null 2>&1; then
    log "Preflight: sudo is unavailable; clean step cannot use privileged ownership fallback."
    return
  fi

  require_host_bin sudo
  if ! sudo -n true >/dev/null 2>&1; then
    log "Preflight: non-interactive sudo is unavailable; clean step may fail on root-owned files."
  fi
}

validate_docker_access() {
  require_host_bin docker

  if ! docker version >/dev/null 2>&1; then
    die "Docker is installed but unreachable. Ensure daemon is running and user has access (docker group/rootless/sudo)."
  fi
}

ensure_docker_image() {
  local image="$1"

  if docker image inspect "$image" >/dev/null 2>&1; then
    return
  fi

  log "Preflight: Docker image ${image} not found locally; pulling now (this can take several minutes on first run)."
  if ! docker pull "$image"; then
    die "Failed to pull required Docker image: ${image}"
  fi
}

validate_docker_mount_permissions() {
  ensure_docker_image "$NODE_ALPINE_IMAGE"

  if ! docker run --rm \
    -u "${HOST_UID}:${HOST_GID}" \
    -v "$PWD":/app \
    -w /app \
    "$NODE_ALPINE_IMAGE" \
    sh -lc 'test -r package.json && test -w /app'; then
    die "Docker can run, but mounted workspace access failed for uid:${HOST_UID} gid:${HOST_GID}. Fix workspace ownership/permissions."
  fi
}

validate_container_bins() {
  local image="$1"
  shift

  local bin
  local checks=""

  ensure_docker_image "$image"

  for bin in "$@"; do
    checks="${checks}command -v ${bin} >/dev/null 2>&1 || { echo \"Missing binary: ${bin}\" >&2; exit 1; }; "
  done

  if ! docker run --rm "$image" sh -lc "set -eu; ${checks}"; then
    die "Preflight failed: required binaries are missing in Docker image ${image}."
  fi
}

validate_privileged_docker() {
  if ! docker run --rm --privileged "$NODE_BOOKWORM_IMAGE" sh -lc 'true' >/dev/null 2>&1; then
    die "Selected Linux packaging steps require privileged containers, but Docker denied --privileged execution."
  fi
}

validate_android_env_file() {
  local key
  local -a required_keys=(
    ANDROID_KEYSTORE_BASE64
    ANDROID_KEYSTORE_PASSWORD
    ANDROID_KEY_ALIAS
    ANDROID_KEY_PASSWORD
  )

  ANDROID_ENV_READY=0

  if [ "$RUN_ANDROID" -eq 0 ]; then
    return
  fi

  if [ ! -f "$ANDROID_ENV_FILE" ]; then
    log "Preflight: ${ANDROID_ENV_FILE} not found; Android step will be skipped."
    return
  fi

  [ -r "$ANDROID_ENV_FILE" ] || die "Android env file ${ANDROID_ENV_FILE} exists but is not readable."

  for key in "${required_keys[@]}"; do
    if ! grep -Eq "^[[:space:]]*(export[[:space:]]+)?${key}=.+" "$ANDROID_ENV_FILE"; then
      die "Android env file ${ANDROID_ENV_FILE} must define a non-empty ${key}=..."
    fi
  done

  ANDROID_ENV_READY=1
}

run_preflight_checks() {
  log "Running preflight validation..."

  validate_repo_root
  validate_host_bins_for_selected_steps
  validate_workspace_permissions
  validate_sudo_preconditions
  validate_android_env_file

  if ! docker_steps_selected; then
    log "Preflight validation: done (no Docker-backed steps selected)."
    return
  fi

  validate_docker_access
  validate_docker_mount_permissions

  if [ "$RUN_WEB" -eq 1 ] || [ "$RUN_TESTS" -eq 1 ]; then
    validate_container_bins "$NODE_ALPINE_IMAGE" yarn npx
  fi

  if [ "$RUN_APPIMAGE" -eq 1 ] || [ "$RUN_FLATPAK" -eq 1 ]; then
    validate_container_bins "$NODE_BOOKWORM_IMAGE" bash apt-get yarn npx chown
    validate_privileged_docker
  fi

  if [ "$RUN_ANDROID" -eq 1 ] && [ "$ANDROID_ENV_READY" -eq 1 ]; then
    validate_container_bins "$ANDROID_IMAGE" bash apt-get yarn npx base64 chmod
  fi

  log "Preflight validation: done."
}

linux_arch_args() {
  case "$LINUX_ARCH" in
    x64) echo "--x64" ;;
    arm64) echo "--arm64" ;;
    both) echo "--x64 --arm64" ;;
    *) die "Unsupported linux arch: ${LINUX_ARCH}" ;;
  esac
}

android_gradle_tasks() {
  case "$ANDROID_TARGET" in
    apk) echo "assembleRelease" ;;
    aab) echo "bundleRelease" ;;
    both) echo "assembleRelease bundleRelease" ;;
    *) die "Unsupported android target: ${ANDROID_TARGET}" ;;
  esac
}

docker_node_alpine() {
  docker run --rm \
    -u "${HOST_UID}:${HOST_GID}" \
    -v "$PWD":/app \
    -w /app \
    "$NODE_ALPINE_IMAGE" \
    "$@"
}

docker_node_bookworm_script() {
  local script="$1"
  docker run --rm --privileged \
    -v "$PWD":/app \
    -w /app \
    "$NODE_BOOKWORM_IMAGE" \
    bash -c "$script"
}

docker_android_script() {
  local script="$1"
  docker run --rm \
    --env-file "$ANDROID_ENV_FILE" \
    -v "$PWD":/app \
    -w /app \
    "$ANDROID_IMAGE" \
    bash -c "$script"
}

print_selection() {
  log "Selected steps: ${STEPS_REQUESTED}"
  log "Linux target filter: ${LINUX_TARGET}"
  log "Linux architecture: ${LINUX_ARCH}"
  log "Android target: ${ANDROID_TARGET}"
  log "Sudo ownership fix: ${USE_SUDO_CHOWN}"
}

run_cleanup() {
  local -a cleanup_paths=(build/ dist/ dist-desktop/ android/app/build/)

  log "Step clean: removing prior build output and fixing ownership..."

  if [ "$USE_SUDO_CHOWN" -eq 0 ]; then
    log "Step clean: skipping ownership normalization (--no-sudo-chown)."
  elif [ "$HOST_UID" -eq 0 ]; then
    chown -R "${HOST_UID}:${HOST_GID}" . || true
  elif command -v sudo >/dev/null 2>&1; then
    # Use non-interactive sudo to avoid hanging on password prompts in unattended runs.
    if sudo -n chown -R "${HOST_UID}:${HOST_GID}" . 2>/dev/null; then
      log "Step clean: ownership normalized with sudo."
    else
      log "Step clean: non-interactive sudo unavailable; skipping ownership normalization."
      log "Step clean: run 'sudo -v' before this script, configure NOPASSWD, or use --no-sudo-chown."
    fi
  else
    log "Step clean: sudo is not available; skipping ownership normalization."
  fi

  if rm -rf "${cleanup_paths[@]}"; then
    log "Step clean: done."
    return
  fi

  log "Step clean: non-privileged cleanup failed; retrying with non-interactive sudo..."
  if command -v sudo >/dev/null 2>&1 && sudo -n rm -rf "${cleanup_paths[@]}"; then
    log "Step clean: done (sudo fallback)."
    return
  fi

  die "Cleanup failed. Run 'sudo -v' and retry, or manually fix ownership in build/dist/android paths."
}

run_web_build() {
  log "Step web: installing dependencies and building web app..."
  docker_node_alpine yarn install --mode update-lockfile
  docker_node_alpine yarn build
  log "Step web: done."
}

run_tests() {
  log "Step test: running automated tests..."
  docker_node_alpine yarn test --run --reporter=verbose
  log "Step test: done."
}

run_appimage() {
  if [ "$LINUX_TARGET" = "flatpak" ]; then
    log "Step appimage: skipped by --linux-target=${LINUX_TARGET}."
    return
  fi

  local arch_args
  arch_args="$(linux_arch_args)"

  log "Step appimage: building Linux AppImage (${LINUX_ARCH})..."
  docker_node_bookworm_script "
    set -euo pipefail
    apt-get update
    apt-get install -y squashfs-tools
    yarn install
    yarn prebuild:desktop
    yarn build
    npx electron-builder --linux AppImage ${arch_args}
    chown -R ${HOST_UID}:${HOST_GID} dist dist-desktop node_modules build
  "
  log "Step appimage: done."
}

run_flatpak() {
  if [ "$LINUX_TARGET" = "appimage" ]; then
    log "Step flatpak: skipped by --linux-target=${LINUX_TARGET}."
    return
  fi

  local arch_args
  arch_args="$(linux_arch_args)"

  log "Step flatpak: building Linux Flatpak (${LINUX_ARCH})..."
  docker_node_bookworm_script "
    set -euo pipefail
    apt-get update
    apt-get install -y flatpak flatpak-builder dbus elfutils imagemagick
    mkdir -p /var/lib/dbus
    dbus-uuidgen > /var/lib/dbus/machine-id
    flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
    yarn install
    yarn prebuild:desktop
    yarn build
    DEBUG=flatpak-bundler npx electron-builder --linux flatpak ${arch_args}
    chown -R ${HOST_UID}:${HOST_GID} dist dist-desktop node_modules build
    [ ! -d .flatpak-builder ] || chown -R ${HOST_UID}:${HOST_GID} .flatpak-builder
  "
  log "Step flatpak: done."
}

run_android() {
  if [ "$ANDROID_ENV_READY" -eq 0 ]; then
    log "Step android: skipped because ${ANDROID_ENV_FILE} is unavailable or incomplete."
    return
  fi

  local gradle_tasks
  gradle_tasks="$(android_gradle_tasks)"

  log "Step android: building Android target (${ANDROID_TARGET})..."
  docker_android_script "
    set -euo pipefail
    trap 'rm -f android/app/keystore.jks' EXIT
    apt-get update
    apt-get install -y openjdk-21-jdk
    export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
    yarn install
    yarn build
    npx cap sync android
    echo \"\$ANDROID_KEYSTORE_BASE64\" | base64 --decode > android/app/keystore.jks
    cd android
    chmod +x gradlew
    ./gradlew ${gradle_tasks}
    cd ..
    chown -R ${HOST_UID}:${HOST_GID} android dist
  "
  log "Step android: done."
}

print_artifact_summary() {
  log "Artifact summary:"

  if [ "$RUN_APPIMAGE" -eq 1 ] && [ "$LINUX_TARGET" != "flatpak" ]; then
    ls -lh dist-desktop/*.AppImage 2>/dev/null || true
  fi

  if [ "$RUN_FLATPAK" -eq 1 ] && [ "$LINUX_TARGET" != "appimage" ]; then
    ls -lh dist-desktop/*.flatpak 2>/dev/null || true
  fi

  if [ "$RUN_ANDROID" -eq 1 ]; then
    if [ "$ANDROID_TARGET" = "apk" ] || [ "$ANDROID_TARGET" = "both" ]; then
      ls -lh android/app/build/outputs/apk/release/app-release.apk 2>/dev/null || true
    fi
    if [ "$ANDROID_TARGET" = "aab" ] || [ "$ANDROID_TARGET" = "both" ]; then
      ls -lh android/app/build/outputs/bundle/release/app-release.aab 2>/dev/null || true
    fi
  fi
}

main() {
  parse_args "$@"
  print_selection
  run_preflight_checks

  if [ "$RUN_CLEAN" -eq 1 ]; then
    run_cleanup
  fi
  if [ "$RUN_WEB" -eq 1 ]; then
    run_web_build
  fi
  if [ "$RUN_TESTS" -eq 1 ]; then
    run_tests
  fi
  if [ "$RUN_APPIMAGE" -eq 1 ]; then
    run_appimage
  fi
  if [ "$RUN_FLATPAK" -eq 1 ]; then
    run_flatpak
  fi
  if [ "$RUN_ANDROID" -eq 1 ]; then
    run_android
  fi

  log "Build flow complete."
  print_artifact_summary
}

main "$@"