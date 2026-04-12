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
# - Uses node:24-bookworm (privileged) for Linux packaging.
# - Uses reactnativecommunity/react-native-android for Android release builds.
# - Runs step-aware preflight checks for repository location, host binaries,
#   Docker availability/permissions, and Android signing env configuration.
# - Preflight may pull missing Docker images on first run.
# - Tracks execution time per phase with millisecond precision.
# - Prints timing summary on both success and failure.
# - Supports optional per-phase debug mode (off by default).
# - Collects artifacts into a single local directory with local-only filenames.
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
LOCAL_RELEASES_DIR="local-releases"
LOCAL_ARTIFACT_TAG="local"

STEPS_REQUESTED="all"
LINUX_TARGET="both"
LINUX_ARCH="both"
ANDROID_TARGET="both"
DEBUG_REQUESTED="none"
USE_SUDO_CHOWN=1

RUN_CLEAN=0
RUN_WEB=0
RUN_TESTS=0
RUN_APPIMAGE=0
RUN_FLATPAK=0
RUN_DEB=0
RUN_RPM=0
RUN_PACMAN=0
RUN_ANDROID=0
ANDROID_ENV_READY=0

DEBUG_WEB=0
DEBUG_TEST=0
DEBUG_APPIMAGE=0
DEBUG_FLATPAK=0
DEBUG_DEB=0
DEBUG_RPM=0
DEBUG_PACMAN=0
DEBUG_ANDROID=0

HOST_UID="$(id -u)"
HOST_GID="$(id -g)"

SCRIPT_START_MILLIS=0
TIMING_ACTIVE=0
SUMMARY_PRINTED=0

declare -A PHASE_MILLIS=()
declare -A PHASE_STATUS=()
declare -A PHASE_START_MILLIS=()
declare -a PHASE_ORDER=(preflight clean web test appimage flatpak deb rpm pacman android)

trap 'handle_exit "$?"' EXIT

usage() {
  cat <<EOF
Usage:
  ${SCRIPT_NAME} [options]

Build local release artifacts for Sokoban.

Options:
  -h, --help                      Show this help and exit.
  --steps <csv>                   Steps to run (comma-separated).
                                  Values: clean,web,test,appimage,flatpak,deb,rpm,pacman,android,all
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
  --debug <csv>                   Enable debug for selected phases.
                                  Values: web,test,appimage,flatpak,deb,rpm,pacman,android,all,none
                                  Default: none
  --artifact-dir <path>           Output directory for gathered artifacts.
                                  Must be a relative path inside the repo.
                                  Default: ${LOCAL_RELEASES_DIR}
  --artifact-tag <value>          Tag injected into gathered artifact names.
                                  Allowed: letters, numbers, dot, underscore, dash
                                  Default: ${LOCAL_ARTIFACT_TAG}
  --no-sudo-chown                 Skip sudo ownership normalization in clean step.

Preflight Validation:
  - Must run from repository root: ${REPO_ROOT}
  - Confirms host binaries needed by selected steps are executable
  - Confirms Docker daemon access and workspace mount permissions
  - Confirms required binaries exist in selected Docker images
  - May pull missing Docker images during preflight (first run can take time)
  - Validates Android signing variables in ${ANDROID_ENV_FILE} when Android is requested

Artifact Handling:
  - Copies discovered artifacts into ${LOCAL_RELEASES_DIR}/
  - Renames copied artifacts with -${LOCAL_ARTIFACT_TAG} suffix to avoid CI/GitHub naming collisions
  - Can be overridden with --artifact-dir and --artifact-tag

Convenience Shortcuts:
  --appimage-only                 Same as: --steps appimage
  --flatpak-only                  Same as: --steps flatpak
  --deb-only                      Same as: --steps deb
  --rpm-only                      Same as: --steps rpm
  --pacman-only                   Same as: --steps pacman
  --apk-only                      Same as: --steps android --android-target apk
  --aab-only                      Same as: --steps android --android-target aab
  --linux-arm64                   Same as: --linux-arch arm64
  --linux-x64                     Same as: --linux-arch x64
  --debug-all                     Same as: --debug all

Examples:
  ${SCRIPT_NAME}
  ${SCRIPT_NAME} --steps appimage,flatpak --linux-arch arm64
  ${SCRIPT_NAME} --flatpak-only --linux-arch x64
  ${SCRIPT_NAME} --apk-only
  ${SCRIPT_NAME} --steps clean,web,test
  ${SCRIPT_NAME} --steps deb,rpm --artifact-dir local-release-candidates --artifact-tag localdev
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

phase_debug_enabled() {
  local phase="$1"

  case "$phase" in
    web) [ "$DEBUG_WEB" -eq 1 ] ;;
    test) [ "$DEBUG_TEST" -eq 1 ] ;;
    appimage) [ "$DEBUG_APPIMAGE" -eq 1 ] ;;
    flatpak) [ "$DEBUG_FLATPAK" -eq 1 ] ;;
    deb) [ "$DEBUG_DEB" -eq 1 ] ;;
    rpm) [ "$DEBUG_RPM" -eq 1 ] ;;
    pacman) [ "$DEBUG_PACMAN" -eq 1 ] ;;
    android) [ "$DEBUG_ANDROID" -eq 1 ] ;;
    *) return 1 ;;
  esac
}

now_millis() {
  local ts

  ts="$(date +%s%3N 2>/dev/null || true)"
  if [ -n "$ts" ] && [[ "$ts" =~ ^[0-9]+$ ]]; then
    printf '%s' "$ts"
    return
  fi

  printf '%s000' "$(date +%s)"
}

format_duration() {
  local total_millis="$1"
  local hours
  local minutes
  local seconds
  local millis
  local remainder

  hours=$((total_millis / 3600000))
  remainder=$((total_millis % 3600000))
  minutes=$((remainder / 60000))
  remainder=$((remainder % 60000))
  seconds=$((remainder / 1000))
  millis=$((remainder % 1000))

  printf '%02dh:%02dm:%02ds.%03d' "$hours" "$minutes" "$seconds" "$millis"
}

init_phase_tracking() {
  local phase

  for phase in "${PHASE_ORDER[@]}"; do
    PHASE_MILLIS["$phase"]=0
    PHASE_START_MILLIS["$phase"]=0
    PHASE_STATUS["$phase"]="not-selected"
  done

  PHASE_STATUS["preflight"]="pending"
  [ "$RUN_CLEAN" -eq 1 ] && PHASE_STATUS["clean"]="pending"
  [ "$RUN_WEB" -eq 1 ] && PHASE_STATUS["web"]="pending"
  [ "$RUN_TESTS" -eq 1 ] && PHASE_STATUS["test"]="pending"
  [ "$RUN_APPIMAGE" -eq 1 ] && PHASE_STATUS["appimage"]="pending"
  [ "$RUN_FLATPAK" -eq 1 ] && PHASE_STATUS["flatpak"]="pending"
  [ "$RUN_DEB" -eq 1 ] && PHASE_STATUS["deb"]="pending"
  [ "$RUN_RPM" -eq 1 ] && PHASE_STATUS["rpm"]="pending"
  [ "$RUN_PACMAN" -eq 1 ] && PHASE_STATUS["pacman"]="pending"
  [ "$RUN_ANDROID" -eq 1 ] && PHASE_STATUS["android"]="pending"

  return 0
}

run_phase() {
  local phase="$1"
  shift

  local start_millis
  local end_millis
  local elapsed

  PHASE_STATUS["$phase"]="running"
  start_millis="$(now_millis)"
  PHASE_START_MILLIS["$phase"]="$start_millis"

  "$@"

  end_millis="$(now_millis)"
  elapsed=$((end_millis - start_millis))

  if [ "${PHASE_STATUS[$phase]}" = "skipped" ]; then
    PHASE_MILLIS["$phase"]=0
    PHASE_START_MILLIS["$phase"]=0
    log "Phase ${phase}: skipped."
    return
  fi

  PHASE_MILLIS["$phase"]="$elapsed"
  PHASE_START_MILLIS["$phase"]=0
  PHASE_STATUS["$phase"]="done"
  log "Phase ${phase}: completed in $(format_duration "$elapsed")"
}

finalize_running_phases_on_failure() {
  local phase
  local phase_status
  local phase_start
  local end_millis
  local elapsed

  end_millis="$(now_millis)"

  for phase in "${PHASE_ORDER[@]}"; do
    phase_status="${PHASE_STATUS[$phase]:-unknown}"
    if [ "$phase_status" = "running" ]; then
      phase_start="${PHASE_START_MILLIS[$phase]:-0}"
      elapsed=$((end_millis - phase_start))
      if [ "$elapsed" -lt 0 ]; then
        elapsed=0
      fi
      PHASE_MILLIS["$phase"]="$elapsed"
      PHASE_START_MILLIS["$phase"]=0
      PHASE_STATUS["$phase"]="failed"
    fi
  done
}

print_timing_summary() {
  local exit_code="$1"
  local phase
  local phase_status
  local phase_millis
  local total_elapsed

  if [ "$TIMING_ACTIVE" -eq 0 ] || [ "$SUMMARY_PRINTED" -eq 1 ]; then
    return
  fi

  SUMMARY_PRINTED=1
  total_elapsed=$(( $(now_millis) - SCRIPT_START_MILLIS ))

  log "Timing summary:"
  printf '[build-releases] %-10s | %-12s | %s\n' "Phase" "Status" "Duration"
  printf '[build-releases] %-10s-+-%-12s-+-%s\n' "----------" "------------" "------------"

  for phase in "${PHASE_ORDER[@]}"; do
    phase_status="${PHASE_STATUS[$phase]:-unknown}"
    phase_millis="${PHASE_MILLIS[$phase]:-0}"
    printf '[build-releases] %-10s | %-12s | %s\n' \
      "$phase" "$phase_status" "$(format_duration "$phase_millis")"
  done

  if [ "$exit_code" -eq 0 ]; then
    log "Total runtime: $(format_duration "$total_elapsed")"
  else
    log "Total runtime: $(format_duration "$total_elapsed") (failed, exit code ${exit_code})"
  fi
}

handle_exit() {
  local exit_code="$1"

  set +e
  set +u

  if [ "$TIMING_ACTIVE" -eq 0 ]; then
    return
  fi

  if [ "$exit_code" -ne 0 ]; then
    finalize_running_phases_on_failure
  fi

  print_timing_summary "$exit_code"
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

validate_artifact_options() {
  local part
  local -a path_parts

  while [ "${LOCAL_RELEASES_DIR%/}" != "$LOCAL_RELEASES_DIR" ]; do
    LOCAL_RELEASES_DIR="${LOCAL_RELEASES_DIR%/}"
  done

  [ -n "$LOCAL_RELEASES_DIR" ] || die "--artifact-dir cannot be empty."
  [ "$LOCAL_RELEASES_DIR" != "." ] || die "--artifact-dir cannot be '.'; choose a directory name."

  case "$LOCAL_RELEASES_DIR" in
    /*)
      die "--artifact-dir must be a relative path inside the repository."
      ;;
  esac

  IFS='/' read -r -a path_parts <<< "$LOCAL_RELEASES_DIR"
  for part in "${path_parts[@]}"; do
    case "$part" in
      ""|".")
        ;;
      "..")
        die "--artifact-dir must not contain '..' path segments."
        ;;
    esac
  done

  if [ -z "$LOCAL_ARTIFACT_TAG" ]; then
    die "--artifact-tag cannot be empty."
  fi

  if [[ ! "$LOCAL_ARTIFACT_TAG" =~ ^[A-Za-z0-9._-]+$ ]]; then
    die "Invalid --artifact-tag '${LOCAL_ARTIFACT_TAG}'. Use only letters, numbers, dot, underscore, or dash."
  fi
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
    RUN_DEB=1
    RUN_RPM=1
    RUN_PACMAN=1
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
      deb) RUN_DEB=1 ;;
      rpm) RUN_RPM=1 ;;
      pacman) RUN_PACMAN=1 ;;
      android) RUN_ANDROID=1 ;;
      all)
        RUN_CLEAN=1
        RUN_WEB=1
        RUN_TESTS=1
        RUN_APPIMAGE=1
        RUN_FLATPAK=1
        RUN_DEB=1
        RUN_RPM=1
        RUN_PACMAN=1
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
     [ "$RUN_APPIMAGE" -eq 0 ] && [ "$RUN_FLATPAK" -eq 0 ] && [ "$RUN_DEB" -eq 0 ] && \
     [ "$RUN_RPM" -eq 0 ] && [ "$RUN_PACMAN" -eq 0 ] && [ "$RUN_ANDROID" -eq 0 ]; then
    die "No runnable steps selected. Use --steps with at least one valid step."
  fi
}

configure_debug_flags() {
  local raw
  local debug_target
  local -a raw_targets

  if [ "$DEBUG_REQUESTED" = "none" ] || [ -z "$DEBUG_REQUESTED" ]; then
    return
  fi

  IFS=',' read -r -a raw_targets <<< "$DEBUG_REQUESTED"
  for raw in "${raw_targets[@]}"; do
    debug_target="${raw//[[:space:]]/}"
    case "$debug_target" in
      web) DEBUG_WEB=1 ;;
      test) DEBUG_TEST=1 ;;
      appimage) DEBUG_APPIMAGE=1 ;;
      flatpak) DEBUG_FLATPAK=1 ;;
      deb) DEBUG_DEB=1 ;;
      rpm) DEBUG_RPM=1 ;;
      pacman) DEBUG_PACMAN=1 ;;
      android) DEBUG_ANDROID=1 ;;
      all)
        DEBUG_WEB=1
        DEBUG_TEST=1
        DEBUG_APPIMAGE=1
        DEBUG_FLATPAK=1
        DEBUG_DEB=1
        DEBUG_RPM=1
        DEBUG_PACMAN=1
        DEBUG_ANDROID=1
        ;;
      none|"")
        ;;
      *)
        die "Unknown value in --debug: ${debug_target}. Allowed values: web,test,appimage,flatpak,deb,rpm,pacman,android,all,none"
        ;;
    esac
  done
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
      --debug)
        [ "$#" -ge 2 ] || die "--debug requires a value"
        DEBUG_REQUESTED="$(to_lower "$2")"
        shift 2
        ;;
      --artifact-dir)
        [ "$#" -ge 2 ] || die "--artifact-dir requires a value"
        LOCAL_RELEASES_DIR="$2"
        shift 2
        ;;
      --artifact-tag)
        [ "$#" -ge 2 ] || die "--artifact-tag requires a value"
        LOCAL_ARTIFACT_TAG="$2"
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
      --deb-only)
        STEPS_REQUESTED="deb"
        shift
        ;;
      --rpm-only)
        STEPS_REQUESTED="rpm"
        shift
        ;;
      --pacman-only)
        STEPS_REQUESTED="pacman"
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
      --debug-all)
        DEBUG_REQUESTED="all"
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
  validate_artifact_options

  configure_steps
  configure_debug_flags
}

docker_steps_selected() {
  if [ "$RUN_WEB" -eq 1 ] || [ "$RUN_TESTS" -eq 1 ] || [ "$RUN_APPIMAGE" -eq 1 ] || \
     [ "$RUN_FLATPAK" -eq 1 ] || [ "$RUN_DEB" -eq 1 ] || [ "$RUN_RPM" -eq 1 ] || \
     [ "$RUN_PACMAN" -eq 1 ] || [ "$RUN_ANDROID" -eq 1 ]; then
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

  if [ "$RUN_APPIMAGE" -eq 1 ] || [ "$RUN_FLATPAK" -eq 1 ] || [ "$RUN_DEB" -eq 1 ] || \
     [ "$RUN_RPM" -eq 1 ] || [ "$RUN_PACMAN" -eq 1 ] || [ "$RUN_ANDROID" -eq 1 ]; then
    host_bins+=(ls)
  fi

  if [ "$RUN_ANDROID" -eq 1 ]; then
    host_bins+=(grep)
  fi

    if [ "$RUN_APPIMAGE" -eq 1 ] || [ "$RUN_FLATPAK" -eq 1 ] || [ "$RUN_DEB" -eq 1 ] || \
      [ "$RUN_RPM" -eq 1 ] || [ "$RUN_PACMAN" -eq 1 ] || [ "$RUN_ANDROID" -eq 1 ] || \
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

  if [ "$RUN_APPIMAGE" -eq 1 ] || [ "$RUN_FLATPAK" -eq 1 ] || [ "$RUN_DEB" -eq 1 ] || \
     [ "$RUN_RPM" -eq 1 ] || [ "$RUN_PACMAN" -eq 1 ]; then
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
  log "Debug phases: ${DEBUG_REQUESTED}"
  log "Artifact directory: ${LOCAL_RELEASES_DIR}"
  log "Artifact tag: ${LOCAL_ARTIFACT_TAG}"
  log "Sudo ownership fix: ${USE_SUDO_CHOWN}"
}

run_cleanup() {
  local -a cleanup_paths=(build/ dist/ dist-desktop/ android/app/build/ "${LOCAL_RELEASES_DIR}"/)

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

  if phase_debug_enabled web; then
    log "Step web: DEBUG enabled."
    docker_node_alpine env DEBUG="*" yarn install --mode update-lockfile
    docker_node_alpine env DEBUG="*" yarn build
  else
    docker_node_alpine yarn install --mode update-lockfile
    docker_node_alpine yarn build
  fi

  log "Step web: done."
}

run_tests() {
  log "Step test: running automated tests..."

  if phase_debug_enabled test; then
    log "Step test: DEBUG enabled."
    docker_node_alpine env DEBUG="*" yarn test --run --reporter=verbose
  else
    docker_node_alpine yarn test --run --reporter=verbose
  fi

  log "Step test: done."
}

run_appimage() {
  if [ "$LINUX_TARGET" = "flatpak" ]; then
    PHASE_STATUS["appimage"]="skipped"
    log "Step appimage: skipped by --linux-target=${LINUX_TARGET}."
    return
  fi

  local arch_args
  local electron_builder_cmd

  arch_args="$(linux_arch_args)"
  electron_builder_cmd="npx electron-builder --linux AppImage ${arch_args}"

  if phase_debug_enabled appimage; then
    log "Step appimage: DEBUG enabled."
    electron_builder_cmd="DEBUG=* ${electron_builder_cmd}"
  fi

  log "Step appimage: building Linux AppImage (${LINUX_ARCH})..."
  docker_node_bookworm_script "
    set -euo pipefail
    apt-get update
    apt-get install -y squashfs-tools
    yarn install
    yarn prebuild:desktop
    yarn build
    ${electron_builder_cmd}
    chown -R ${HOST_UID}:${HOST_GID} dist dist-desktop node_modules build
  "
  log "Step appimage: done."
}

run_flatpak() {
  if [ "$LINUX_TARGET" = "appimage" ]; then
    PHASE_STATUS["flatpak"]="skipped"
    log "Step flatpak: skipped by --linux-target=${LINUX_TARGET}."
    return
  fi

  local arch_args
  local flatpak_debug_value

  arch_args="$(linux_arch_args)"
  flatpak_debug_value="flatpak-bundler"

  if phase_debug_enabled flatpak; then
    log "Step flatpak: DEBUG enabled."
    flatpak_debug_value="flatpak-bundler,*"
  fi

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
    DEBUG=${flatpak_debug_value} npx electron-builder --linux flatpak ${arch_args}
    chown -R ${HOST_UID}:${HOST_GID} dist dist-desktop node_modules build
    [ ! -d .flatpak-builder ] || chown -R ${HOST_UID}:${HOST_GID} .flatpak-builder
  "
  log "Step flatpak: done."
}

run_deb() {
  local arch_args
  local electron_builder_cmd

  arch_args="$(linux_arch_args)"
  electron_builder_cmd="npx electron-builder --linux deb ${arch_args}"

  if phase_debug_enabled deb; then
    log "Step deb: DEBUG enabled."
    electron_builder_cmd="DEBUG=* ${electron_builder_cmd}"
  fi

  log "Step deb: building Linux DEB (${LINUX_ARCH})..."
  docker_node_bookworm_script "
    set -euo pipefail
    apt-get update
    apt-get install -y fakeroot dpkg
    yarn install
    yarn prebuild:desktop
    yarn build
    ${electron_builder_cmd}
    chown -R ${HOST_UID}:${HOST_GID} dist dist-desktop node_modules build
  "
  log "Step deb: done."
}

run_rpm() {
  local arch_args
  local electron_builder_cmd

  arch_args="$(linux_arch_args)"
  electron_builder_cmd="npx electron-builder --linux rpm ${arch_args}"

  if phase_debug_enabled rpm; then
    log "Step rpm: DEBUG enabled."
    electron_builder_cmd="DEBUG=* ${electron_builder_cmd}"
  fi

  log "Step rpm: building Linux RPM (${LINUX_ARCH})..."
  docker_node_bookworm_script "
    set -euo pipefail
    apt-get update
    apt-get install -y rpm
    yarn install
    yarn prebuild:desktop
    yarn build
    ${electron_builder_cmd}
    chown -R ${HOST_UID}:${HOST_GID} dist dist-desktop node_modules build
  "
  log "Step rpm: done."
}

run_pacman() {
  local arch_args
  local electron_builder_cmd

  arch_args="$(linux_arch_args)"
  electron_builder_cmd="npx electron-builder --linux pacman ${arch_args}"

  if phase_debug_enabled pacman; then
    log "Step pacman: DEBUG enabled."
    electron_builder_cmd="DEBUG=* ${electron_builder_cmd}"
  fi

  log "Step pacman: building Linux Pacman package (${LINUX_ARCH})..."
  docker_node_bookworm_script "
    set -euo pipefail
    apt-get update
    apt-get install -y libarchive-tools zstd fakeroot xz-utils
    command -v bsdtar >/dev/null 2>&1 || { echo 'Error: bsdtar is required for pacman packaging but was not found.' >&2; exit 1; }
    yarn install
    yarn prebuild:desktop
    yarn build
    ${electron_builder_cmd}
    chown -R ${HOST_UID}:${HOST_GID} dist dist-desktop node_modules build
  "
  log "Step pacman: done."
}

run_android() {
  if [ "$ANDROID_ENV_READY" -eq 0 ]; then
    PHASE_STATUS["android"]="skipped"
    log "Step android: skipped because ${ANDROID_ENV_FILE} is unavailable or incomplete."
    return
  fi

  local gradle_tasks
  local debug_preamble=""

  gradle_tasks="$(android_gradle_tasks)"

  if phase_debug_enabled android; then
    log "Step android: DEBUG enabled."
    debug_preamble='export DEBUG="*"'
  fi

  log "Step android: building Android target (${ANDROID_TARGET})..."
  docker_android_script "
    set -euo pipefail
    trap 'rm -f android/app/keystore.jks' EXIT
    ${debug_preamble}
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

tag_local_artifact_name() {
  local filename="$1"
  local stem
  local tail

  if [[ "$filename" == *.pkg.tar.* ]]; then
    stem="${filename%%.pkg.tar.*}"
    tail="${filename#${stem}}"
    printf '%s-%s%s' "$stem" "$LOCAL_ARTIFACT_TAG" "$tail"
    return
  fi

  if [[ "$filename" == *.* ]]; then
    printf '%s-%s.%s' "${filename%.*}" "$LOCAL_ARTIFACT_TAG" "${filename##*.}"
    return
  fi

  printf '%s-%s' "$filename" "$LOCAL_ARTIFACT_TAG"
}

copy_local_artifact() {
  local source_file="$1"
  local target_name="$2"

  [ -f "$source_file" ] || return 1
  cp -f "$source_file" "${LOCAL_RELEASES_DIR}/${target_name}"
  return 0
}

gather_artifacts() {
  local pattern
  local file
  local filename
  local tagged_name
  local copied_count=0
  local -a desktop_patterns=(
    dist-desktop/*.AppImage
    dist-desktop/*.flatpak
    dist-desktop/*.deb
    dist-desktop/*.rpm
    dist-desktop/*.pacman
    dist-desktop/*.pkg.tar.*
  )

  log "Gathering artifacts into ${LOCAL_RELEASES_DIR}/..."
  mkdir -p "$LOCAL_RELEASES_DIR"

  for pattern in "${desktop_patterns[@]}"; do
    for file in $pattern; do
      [ -f "$file" ] || continue
      filename="$(basename "$file")"
      tagged_name="$(tag_local_artifact_name "$filename")"
      cp -f "$file" "${LOCAL_RELEASES_DIR}/${tagged_name}"
      copied_count=$((copied_count + 1))
    done
  done

  if copy_local_artifact "android/app/build/outputs/apk/release/app-release.apk" "Sokoban-${LOCAL_ARTIFACT_TAG}-release.apk"; then
    copied_count=$((copied_count + 1))
  fi

  if copy_local_artifact "android/app/build/outputs/bundle/release/app-release.aab" "Sokoban-${LOCAL_ARTIFACT_TAG}-release.aab"; then
    copied_count=$((copied_count + 1))
  fi

  if [ "$copied_count" -eq 0 ]; then
    log "Gathering artifacts: no files found to collect."
    return
  fi

  if [ "$HOST_UID" -eq 0 ]; then
    chown -R "${HOST_UID}:${HOST_GID}" "$LOCAL_RELEASES_DIR" || true
  elif command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    sudo -n chown -R "${HOST_UID}:${HOST_GID}" "$LOCAL_RELEASES_DIR" || true
  else
    chown -R "${HOST_UID}:${HOST_GID}" "$LOCAL_RELEASES_DIR" 2>/dev/null || true
  fi

  log "Gathering artifacts: copied ${copied_count} file(s) into ${LOCAL_RELEASES_DIR}/."
}

print_artifact_summary() {
  log "Artifact summary (${LOCAL_RELEASES_DIR}/):"
  if ls -lh "${LOCAL_RELEASES_DIR}"/* 2>/dev/null; then
    return
  fi

  log "No artifacts found in ${LOCAL_RELEASES_DIR}/."
}

main() {
  SCRIPT_START_MILLIS="$(now_millis)"
  parse_args "$@"
  init_phase_tracking
  TIMING_ACTIVE=1
  print_selection
  run_phase preflight run_preflight_checks

  if [ "$RUN_CLEAN" -eq 1 ]; then
    run_phase clean run_cleanup
  fi
  if [ "$RUN_WEB" -eq 1 ]; then
    run_phase web run_web_build
  fi
  if [ "$RUN_TESTS" -eq 1 ]; then
    run_phase test run_tests
  fi
  if [ "$RUN_APPIMAGE" -eq 1 ]; then
    run_phase appimage run_appimage
  fi
  if [ "$RUN_FLATPAK" -eq 1 ]; then
    run_phase flatpak run_flatpak
  fi
  if [ "$RUN_DEB" -eq 1 ]; then
    run_phase deb run_deb
  fi
  if [ "$RUN_RPM" -eq 1 ]; then
    run_phase rpm run_rpm
  fi
  if [ "$RUN_PACMAN" -eq 1 ]; then
    run_phase pacman run_pacman
  fi
  if [ "$RUN_ANDROID" -eq 1 ]; then
    run_phase android run_android
  fi

  log "Build flow complete."
  gather_artifacts
  print_artifact_summary
}

main "$@"