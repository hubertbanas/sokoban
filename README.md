# Sokoban

A modernized Sokoban implementation built with React + TypeScript + Vite.

Live app: https://hubertbanas.github.io/sokoban/

## What Is Included

- 490 bundled puzzle levels (`Original`, `Atlas01` to `Atlas04`)
- Keyboard gameplay controls (move, undo, restart, level navigation)
- Mobile/coarse-pointer touch controls with a draggable dpad
- Hold-to-repeat behavior for level and direction controls
- Light/dark theme support with persisted user preference
- About modal with runtime app version from `package.json`
- Desktop packaging for Windows (`.exe`) and Linux (`.AppImage`, `.flatpak`, `.snap`, `.deb`, `.rpm`, `.pacman`) via Electron
- Docker and Docker Compose support for dev/prod usage
- GitHub Actions for Pages deploy, auto-tagging, container publishing, and desktop/Android release assets

## Mobile Touch Controls

The mobile dpad appears automatically on coarse-pointer/hoverless devices.

- Four directional touch regions (up/left/right/down)
- Press-and-hold repeats movement
- `Undo` supports press-and-hold repeat
- Center circular handle can be dragged to reposition the control
- Double-tap the center handle to reset dpad position
- Dedicated `Undo` and `Restart` touch buttons (mapped to Backspace and Escape actions)
- `Undo` and `Restart` action buttons are positioned above the dpad
- Dpad position is persisted in `localStorage`
- Long-press context menu is suppressed for stable hold behavior (including Firefox emulation scenarios)

## Controls

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

## Game Behavior Notes

- The board tile size adapts to viewport dimensions and level size.
- Level index is persisted in `localStorage` (`SokobanLevel`).
- Theme mode is persisted in `localStorage` (`sokoban-theme-mode`).
- When mode is `auto`, theme follows `prefers-color-scheme` unless `VITE_DEFAULT_THEME` is set to `dark` or `light`.
- App dialogs use a shared modal component for consistent behavior and close controls.

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Lodash (deep cloning board state)
- CSS Modules for component styling

## Quick Start (Node)

Install dependencies:

```bash
yarn install
```

Start development server:

```bash
yarn dev
```

Build production bundle:

```bash
yarn build
```

Preview production bundle:

```bash
yarn preview
```

Equivalent `npm` commands work as well (`npm install`, `npm run dev`, `npm run build`, `npm run preview`).

## Docker

Build and run fully inside Docker (without local Node install):

```bash
docker run --rm -v "$PWD":/app -w /app node:24-alpine yarn install
docker run --rm -v "$PWD":/app -w /app node:24-alpine sh -c "yarn build && ls -R dist"
```

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
docker compose -f compose.prod.yaml up -d
```

- Pulls image: `ghcr.io/hubertbanas/sokoban:latest`
- Service/container: `sokoban-prod`
- Host port: `8080` -> container `80`

## Desktop Builds (Electron)

Build desktop binaries locally:

```bash
yarn build:desktop
```

Output directory:

- `dist-desktop/`

Configured targets:

- Windows portable executable (`.exe`, x64 and arm64)
- Windows NSIS installer (`.exe`, x64 and arm64)
- macOS disk image (`.dmg`, x64 and arm64)
- Linux AppImage (`.AppImage`, x64 and arm64)
- Linux Flatpak (`.flatpak`, x64 and arm64)
- Linux Snap (`.snap`, x64)
- Linux Debian package (`.deb`, x64 and arm64)
- Linux RPM package (`.rpm`, x64 and arm64)
- Linux Arch package (`.pacman`, x64 and arm64)

## CI/CD Workflows

- `deploy-github-pages.yml`: Reusable Pages deployment workflow (`workflow_call`) that is invoked by `auto-tag.yml`; it also supports manual dispatch and direct release-tag pushes (`v*`).
- `auto-tag.yml`: Creates a signed `v<version>` tag when `package.json` version changes on `main`/`master`, creates a GitHub release, then invokes publish/deploy target workflows.
- `publish-ghcr.yml`: Reusable GHCR publishing workflow (`workflow_call`) invoked by `auto-tag.yml`; it also supports manual dispatch.
- `publish-desktop.yml`: Reusable desktop packaging workflow (`workflow_call`) invoked by `auto-tag.yml`; it builds and publishes desktop release assets with `.sha256` checksums and `.asc` detached signatures.
	- Windows: NSIS installer `.exe` and portable `.exe` (x64 and arm64)
	- macOS: `.dmg` (x64 and arm64)
	- Linux: `.AppImage` and `.flatpak` (x64 and arm64), `.snap` (x64), `.deb`, `.rpm`, and `.pacman` (x64 and arm64)
	- Software Bill of Materials (SBOM): `Sokoban-SBOM-<version>.spdx.json` with checksum and signature sidecars
	- Source archive: immutable `Sokoban-source-<version>.tar.gz` with checksum and signature sidecars
- `publish-android.yml`: Reusable Android publish workflow (`workflow_call`) invoked by `auto-tag.yml`; it builds signed Android release artifacts (`.apk` and `.aab`) and publishes them with `.sha256` checksums and `.asc` detached signatures.
- `codeql-analysis.yml`: Static security analysis.

Docs-only changes (for example `README.md`) do not create release tags, so they also do not trigger Docker publish or Pages deployment.

For signed tags in CI, configure repository secrets:

- `RELEASE_GPG_PRIVATE_KEY`: ASCII-armored private key used to sign release tags.
- `RELEASE_GPG_PASSPHRASE`: Passphrase for the private key (if set).

The same GPG key secrets are also used to produce release artifact signatures (`.asc`) for desktop and Android assets.

For signed Android release builds in CI, configure repository secrets:

- `ANDROID_KEYSTORE_BASE64`: Base64-encoded release keystore content.
- `ANDROID_KEY_ALIAS`: Keystore key alias.
- `ANDROID_KEYSTORE_PASSWORD`: Keystore password.
- `ANDROID_KEY_PASSWORD`: Key password.

Release note extraction expects changelog headings in this format:

- `## [1.11.2] - 2026-03-21`

## Verify Downloads

Release signatures (`.asc`) are generated using the public key stored in this repository:

- `.github/keys/sokoban-release-key.asc`

Import the release verification key:

```bash
gpg --import .github/keys/sokoban-release-key.asc
```

Verify the imported key fingerprint matches the release key:

```bash
gpg --fingerprint 50AF06A3276DD98E51BA50DFEB5EEC17123943ED
```

Expected fingerprint:

`50AF 06A3 276D D98E 51BA 50DF EB5E EC17 1239 43ED`

After downloading an asset and its sidecar files (`.sha256` and `.asc`), verify integrity and signature.

Automated verification script:

```bash
./scripts/verify-release.sh <version>
```

Example:

```bash
./scripts/verify-release.sh 1.15.0-rc.14
```

Useful options:

- `--keep-dir`: Keep downloaded assets in the temporary workspace for inspection.
- `--work-dir <path>`: Use a custom workspace directory instead of an auto-generated temp path.
- `--repo <owner/repo>`: Verify releases from a different repository.

What the script does:

- Downloads release assets from GitHub for `v<version>`.
- Downloads and verifies the release public key fingerprint before import.
- Verifies all `.sha256` checksums with `sha256sum -c`.
- Verifies all `.asc` detached signatures with GPG (including checksum sidecar signatures such as `.sha256.asc`).

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

## Screenshots

![Sokoban dark theme](docs/assets/screenshot-gameplay-dark.png)

Light theme preview: [docs/assets/screenshot-gameplay-light.png](docs/assets/screenshot-gameplay-light.png)

## Attribution

- Game graphics: [Kenney.nl Sokoban Asset Pack](https://kenney.nl/assets/sokoban) — All in-game sprites, icons, and branding assets are © Kenney, used under the [CC0 1.0 Universal (Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/) license.
- Original project: https://github.com/ecyrbe/sokoban
- Current repository: https://github.com/hubertbanas/sokoban

## License

MIT. See `LICENSE`.

## Changelog

See `CHANGELOG.md` for project history and recent updates.