# Development & Technical Notes

This page contains the technical and development details for this repository.
The main README is intentionally short and user-focused.

## Recommended Developer Workflow

Use the local release script as the main entry point:

```bash
./scripts/build-releases.sh --help
./scripts/build-releases.sh
```

Common examples:

```bash
# Linux desktop artifacts only
./scripts/build-releases.sh --steps appimage,flatpak --linux-arch x64

# Android APK only
./scripts/build-releases.sh --apk-only
```

Notes:

- The script runs builds in containers to minimize host setup.
- It supports selective build steps, logging, and artifact tagging.
- Use `./scripts/build-releases.sh --help` for the full option list.
- Host package-manager workflows (including yarn) are optional and not required for the recommended flow.

## Git Hooks

Install repository hooks once per clone.

Docker-first setup (no host Node or Yarn required):

```bash
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD":/app -w /app node:24-alpine sh scripts/install-git-hooks.sh
```

Optional host shortcut (if Yarn is installed):

```bash
yarn hooks:install
```

The pre-commit guard blocks staged files that commonly contain secrets:

- `.env` and `.env.*` (except `.env.example` and `.env.*.example`)
- anything under `.secrets/`
- Android signing files (`*.jks`, `*.keystore`, `*.p12`, `*.pfx`, `keystore-base64.txt`)
- `android/local.properties`

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Lodash (deep cloning board state)
- CSS Modules for component styling
- Electron for desktop packaging
- Docker/Docker Compose for containerized workflows

## Gameplay/Runtime Notes

### Included Content

- 490 bundled puzzle levels (`Original`, `Atlas01` to `Atlas04`)
- Keyboard gameplay controls (move, undo, restart, level navigation)
- Mobile/coarse-pointer touch controls with a draggable dpad
- Hold-to-repeat behavior for level and direction controls
- Light/dark theme support with persisted user preference
- About modal with runtime app version from `package.json`

### Mobile Touch Controls

The mobile dpad appears automatically on coarse-pointer/hoverless devices.

- Four directional touch regions (up/left/right/down)
- Press-and-hold repeats movement
- `Undo` supports press-and-hold repeat
- Center circular handle can be dragged to reposition the control
- Double-tap the center handle to reset dpad position
- Dedicated `Undo` and `Restart` touch buttons (mapped to Backspace and Escape actions)
- Dpad position is persisted in `localStorage`
- Long-press context menu is suppressed for stable hold behavior (including Firefox emulation scenarios)

### Keyboard/UI Controls

- `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight`: Move
- `Backspace`: Undo
- `Escape`: Restart current level (asks for confirmation after progress exists)
- `[` and `]`: Previous / Next level
- `Enter`: Continue after completion

UI controls:

- `Previous` / `Next` buttons support press-and-hold repeat
- Touch action buttons provide `Undo` and `Restart level` on mobile/coarse-pointer devices
- `Restart level` prompts for confirmation after at least one move
- While restart confirmation is open, gameplay/navigation keyboard input is paused
- In restart confirmation, `Escape` cancels; `Enter` activates the focused action (default focus is `Cancel`)
- `About` opens controls/project info and app version
- Theme switch toggles between light and dark mode

### Persistence and Behavior

- Board tile size adapts to viewport dimensions and level size.
- Level index is persisted in `localStorage` (`SokobanLevel`).
- Theme mode is persisted in `localStorage` (`sokoban-theme-mode`).
- When mode is `auto`, theme follows `prefers-color-scheme` unless `VITE_DEFAULT_THEME` is set to `dark` or `light`.
- App dialogs use a shared modal component for consistent behavior and close controls.

## Docker

Project `Dockerfile` is multi-stage:

- Stage 1: `node:24-alpine` builds `dist/`
- Stage 2: `nginx:alpine` serves static files on port `80`

## Docker Compose

### Development (`compose.dev.yaml`)

```bash
docker compose -f compose.dev.yaml build --progress=plain --no-cache
docker compose -f compose.dev.yaml up -d
```

- Service/container: `sokoban-dev`
- Host port: `8081` -> container `80`

### Production (`compose.prod.yaml`)

```bash
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
```

- Pulls image: `ghcr.io/hubertbanas/sokoban:latest`
- Service/container: `sokoban-prod`
- Host port: `8080` -> container `80`


## Desktop & Android Builds

Release artifacts are produced by the main build script:

```bash
./scripts/build-releases.sh
```

Output directory:

- `local-releases/`


Configured targets (as built by the script):

- **Linux desktop**
  - AppImage (`.AppImage`, x64 and arm64)
  - Flatpak (`.flatpak`, x64 and arm64)
  - Debian package (`.deb`, x64 and arm64)
  - RPM package (`.rpm`, x64 and arm64)
  - Arch package (`.pacman`, x64 and arm64)
- **Android**
  - APK (`.apk`)
  - Android App Bundle (`.aab`)

**Note:** This script does not build Windows (.exe, NSIS) or macOS (.dmg) artifacts. Only Linux and Android outputs are supported in the automated local build process.

All builds are containerized for reproducibility. Use `--help` for advanced options (selective steps, logging, artifact tagging, etc).

## CI/CD Workflows

- `deploy-github-pages.yml`: Reusable Pages deployment workflow (`workflow_call`) invoked by `auto-tag.yml`; also supports manual dispatch and direct release-tag pushes (`v*`).
- `auto-tag.yml`: Creates a signed `v<version>` tag when `package.json` version changes on `main`/`master`, creates a GitHub release, then invokes publish/deploy target workflows.
- `publish-ghcr.yml`: Reusable GHCR publishing workflow (`workflow_call`) invoked by `auto-tag.yml`; also supports manual dispatch.
- `publish-desktop.yml`: Reusable desktop packaging workflow (`workflow_call`) invoked by `auto-tag.yml`; builds and publishes desktop release assets with `.sha256` checksums and `.asc` detached signatures.
- `publish-android.yml`: Reusable Android publish workflow (`workflow_call`) invoked by `auto-tag.yml`; builds signed Android release artifacts (`.apk` and `.aab`) and publishes them with `.sha256` checksums and `.asc` detached signatures.
- `codeql-analysis.yml`: Static security analysis.

Docs-only changes (for example README edits) do not create release tags, so they do not trigger Docker publish or Pages deployment.

### CI Secrets (Release Tag/Artifact Signing)

- `RELEASE_GPG_PRIVATE_KEY`: ASCII-armored private key used to sign release tags.
- `RELEASE_GPG_PASSPHRASE`: Passphrase for the private key (if set).

### CI Secrets (Android Release Signing)

- `ANDROID_KEYSTORE_BASE64`: Base64-encoded release keystore content.
- `ANDROID_KEY_ALIAS`: Keystore key alias.
- `ANDROID_KEYSTORE_PASSWORD`: Keystore password.
- `ANDROID_KEY_PASSWORD`: Key password.

Release note extraction expects changelog headings in this format:

- `## [1.11.2] - 2026-03-21`

## Verify Release Downloads

Release signatures (`.asc`) are generated using the public key stored in this repository:

- `.github/keys/sokoban-release-key.asc`

Import the release verification key:

```bash
gpg --import .github/keys/sokoban-release-key.asc
```

Verify the imported key fingerprint:

```bash
gpg --fingerprint 50AF06A3276DD98E51BA50DFEB5EEC17123943ED
```

Expected fingerprint:

`50AF 06A3 276D D98E 51BA 50DF EB5E EC17 1239 43ED`

Automated verification script:

```bash
./scripts/verify-release.sh <version>
```

Example:

```bash
./scripts/verify-release.sh 1.16.1
```

Useful options:

- `--keep-dir`: Keep downloaded assets in the temporary workspace for inspection.
- `--work-dir <path>`: Use a custom workspace directory instead of an auto-generated temp path.
- `--repo <owner/repo>`: Verify releases from a different repository.

Manual examples:

Linux:

```bash
ASSET="Sokoban-<version>-x64.AppImage"
sha256sum -c "$ASSET.sha256"
gpg --verify "$ASSET.asc" "$ASSET"
```

Android:

```bash
APK="Sokoban-<version>.apk"
AAB="Sokoban-<version>.aab"

sha256sum -c "$APK.sha256"
gpg --verify "$APK.sha256.asc" "$APK.sha256"
gpg --verify "$APK.asc" "$APK"

sha256sum -c "$AAB.sha256"
gpg --verify "$AAB.sha256.asc" "$AAB.sha256"
gpg --verify "$AAB.asc" "$AAB"
```

Signed source archive:

```bash
sha256sum -c Sokoban-source-<version>.tar.gz.sha256
gpg --verify Sokoban-source-<version>.tar.gz.asc Sokoban-source-<version>.tar.gz
gpg --verify Sokoban-source-<version>.tar.gz.sha256.asc Sokoban-source-<version>.tar.gz.sha256
```

Signed SBOM:

```bash
sha256sum -c Sokoban-SBOM-<version>.spdx.json.sha256
gpg --verify Sokoban-SBOM-<version>.spdx.json.asc Sokoban-SBOM-<version>.spdx.json
```

macOS:

```bash
ASSET="Sokoban-<version>-arm64.dmg"
shasum -a 256 -c "$ASSET.sha256"
gpg --verify "$ASSET.asc" "$ASSET"
```

Windows PowerShell:

```powershell
# Windows naming convention:
# - *-setup-*.exe => NSIS installer (wizard-based install)
# - *.exe (without -setup-) => portable executable

# Integrity check (compares local SHA256 to the .sha256 file content)
$file = "Sokoban-<version>-x64.exe"
$expected = (Get-Content "$file.sha256").Split(' ')[0].ToLower()
$actual = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()
if ($expected -eq $actual) { "SHA256 OK" } else { "SHA256 MISMATCH" }

# Signature check (requires GPG installed and imported release key)
gpg --verify "$file.asc" "$file"
```

## Project Layout

- `src/Game.tsx`: Main game UI and keyboard bindings
- `src/hooks/sokoban.ts`: Core move logic and board history
- `src/hooks/levels.ts`: Level loading and parsing
- `src/components/mobile-controls.tsx`: Touch dpad behavior
- `src/components/modal.tsx`: Shared modal dialog primitive
- `src/components/sokoban.module.css`: Main game/control styling
- `src/hooks/theme.tsx`: Theme resolution and persistence
