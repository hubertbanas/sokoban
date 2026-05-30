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

- 493 bundled puzzle levels across six packs (`Tutorial`, `Original`, `Atlas01` to `Atlas04`)
- Localized UI support for `en`, `pl`, `es`, `fr`, `pt-BR`, `de`, `it`, `zh-CN`, `ja`, `ko`, `ru`, and `uk`
- Keyboard gameplay controls (move, undo, restart, level navigation)
- Mobile/coarse-pointer touch controls with a draggable dpad
- Hold-to-repeat behavior for level and direction controls
- Dedicated undo sound effect (`crate-undo.ogg`) for Backspace and touch Undo
- Light/dark theme support with persisted user preference
- About modal with runtime app version from `package.json`

### Localization

- Translation resources are in `src/locales/<locale>/translation.json`.
- i18n setup is configured in `src/i18n.ts`.
- Developer-only pseudo-locale testing uses `en-xa` (exposed in the language selector in dev builds).

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
- `Play Stats` in the menu has two independent visibility toggles: `While playing` and `After finishing a level`
- `Reset Stats` in the same section clears saved stats after confirmation
- `About` opens controls/project info and app version
- Theme switch toggles between light and dark mode

### Persistence and Behavior

- Board tile size adapts to viewport dimensions and level size.
- Current level is persisted by `levelId` in `localStorage` (`sokoban.level-id.v1`).
- Theme mode is persisted in `localStorage` (`sokoban-theme-mode`).
- Stats visibility is persisted in `localStorage` using `sokoban-play-stats-visible` and `sokoban-completion-stats-visible`.
- When mode is `auto`, theme follows `prefers-color-scheme` unless `VITE_DEFAULT_THEME` is set to `dark` or `light`.
- App dialogs use a shared modal component for consistent behavior and close controls.

### Statistics Implementation Notes

- Play statistics include player-facing per-level tracking and bests for `Moves`, `Pushes`, `Undos`, and `Time`.
- The UI renders these as `Current` and `Best` rows in both the gameplay HUD and completion overlay (when enabled).
- Visibility is controlled by two independent menu toggles (`While playing` and `After finishing a level`).
- The completion-overlay visibility key falls back to the play-visibility key to migrate older single-toggle installs.
- Internally, the stats model stores both `levelId` and `puzzleId` records.
- `levelId` is used for player-facing progress and best values.
- `puzzleId` is retained for forward compatibility if future packs reuse the same puzzle layout across different levels.
- In the current bundled packs, puzzle layouts are unique, so level and puzzle records are effectively identical today.

## Docker

Project `docker/Dockerfile` is multi-stage:

- Stage 1: `node:24-alpine` builds `dist/`
- Stage 2: `nginx:alpine` serves static files on port `80`

## Docker Compose

### Development (`docker/compose.dev.yaml`)

```bash
docker compose -f docker/compose.dev.yaml build --progress=plain --no-cache
docker compose -f docker/compose.dev.yaml up -d
```

- Service/container: `sokoban-dev`
- Host port: `8081` -> container `80`

### Production (`docker/compose.prod.yaml`)

```bash
docker compose -f docker/compose.prod.yaml pull
docker compose -f docker/compose.prod.yaml up -d
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
- `publish-ios.yml`: Reusable iOS publishing workflow (`workflow_call`) invoked by `auto-tag.yml`; builds an unsigned iOS Simulator `.app` bundle, packages it as a `.zip`, and publishes it with `.sha256` checksums and `.asc` detached signatures.
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

### CI Secrets (iOS Simulator Publish)

- No Apple certificates or provisioning-profile secrets are required because the iOS artifact is a Simulator build.
- The workflow reuses release-signing secrets (`RELEASE_GPG_PRIVATE_KEY`, optional `RELEASE_GPG_PASSPHRASE`) for `.zip` and checksum signatures.

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

iOS Simulator (unsigned bundle):

```bash
ASSET="Sokoban-<version>-ios-simulator.zip"
shasum -a 256 -c "$ASSET.sha256"
gpg --verify "$ASSET.sha256.asc" "$ASSET.sha256"
gpg --verify "$ASSET.asc" "$ASSET"
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
