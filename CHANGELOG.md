# Changelog

## [1.15.0-rc.15] - 2026-04-05

### Features
- Complete graphics overhaul and cross-platform branding (#101)

### Bug Fixes
- Update favicon and manifest links in `index.html` (#100)
- Implement keyboard navigation for confirmation buttons in modal (#99)
- Mobile UX enhancements for modal interactions and global text selection (#98)
- Update versioning to dynamically retrieve version name and code from `package.json` (#97)
- Resolve text selection and modal dismissal on touch (#96)

### Build & Chores
- Add `verify-release.sh` utility for automated artifact validation (#90)
- Update all non-major dependencies (#91, #102)
- Update `docker/setup-qemu-action` action to v4 (#94)
- Update `actions/deploy-pages` action to v5 (#93)
- Update `actions/configure-pages` action to v6 (#92)

## [1.15.0-rc.14] - 2026-03-28

### Changed
- CI/CD: Patched desktop and Android deployment workflows to strip internal runner paths from generated `.sha256` checksum files, ensuring portable verification.
- Security: Published the repository's public GPG release key (`.github/keys/sokoban-release-key.asc`) and updated verification documentation.

## [1.15.0-rc.13] - 2026-03-28

### Added
- Security: Integrated automated Software Bill of Materials (SBOM) generation (SPDX JSON format) into the deployment matrix.
- Security: Configured the CI/CD pipeline to cryptographically hash (SHA-256) and sign (.asc) the generated SBOM prior to release distribution.

## [1.15.0-rc.12] - 2026-03-27

### Added
- Desktop packaging: Added Windows NSIS installer target (`.exe`) for x64 and arm64 with a distinct `-setup-` artifact name to avoid collisions with portable executables.
- Desktop packaging: Added Linux Arch package target (`.pacman`) for x64 and arm64, including release checksums/signatures and GitHub Release asset uploads.

## [1.15.0-rc.11] - 2026-03-26

### Fixed
- Added author email to satisfy Linux package requirements. (#82)

## [1.15.0-rc.10] - 2026-03-26

### Changed
- CI: Finalized Linux deployment matrix with Debian and Red Hat targets. (#79)
- CI: Added source archive generation. (#80)

## [1.15.0-rc.9] - 2026-03-26

### Changed
- CI/CD Release Reliability: Added robust tag visibility polling before `gh release create --verify-tag` to avoid transient GitHub API propagation race failures after tag push.

## [1.15.0-rc.8] - 2026-03-26

### Changed
- CI/CD Matrix Verification: Triggering a comprehensive release build to validate the newly merged Ubuntu Snap package integration alongside the existing Windows, macOS, Linux, and Android targets.

## [1.15.0-rc.7] - 2026-03-26

### Added
- macOS Build Targets: Configured native `.dmg` compilation for both Intel (x64) and Apple Silicon (arm64) architectures via GitHub Actions `macos-latest` runners.
- macOS Cryptography: Implemented native `shasum` scripting to generate SHA-256 checksums and PGP signatures for Apple artifacts prior to release upload.

## [1.15.0-rc.6] - 2026-03-25

### Added
- CI/CD Security Verification: Testing the cryptographic signing pipeline to ensure all release assets are accompanied by valid SHA-256 checksums and PGP signatures.

## [1.15.0-rc.5] - 2026-03-25

### Added
- CI/CD Finalization Test: Verifying the complete 6-artifact build matrix, ensuring native ARM64 compilation succeeds for both Windows and Linux targets.

## [1.15.0-rc.4] - 2026-03-25

### Added
- CI/CD Fix: Configured Flatpak for unprivileged user-level runtime installation on the Ubuntu runner.

## [1.15.0-rc.3] - 2026-03-25

### Added
- CI/CD Finalization Test: Verifying parallel execution of the build matrix. 
- Desktop Pipeline: Testing Flatpak compilation on the Ubuntu runner and verifying artifact uploads.
- Android Pipeline: Confirming strict secret inheritance and aligned APK/AAB naming conventions.

## [1.15.0-rc.2] - 2026-03-24

### Added
- Android Release Pipeline Test: Verifying the automated generation and upload of the signed release APK and AAB formats.

## [1.15.0-rc.1] - 2026-03-22

### Added
- RC Pipeline Test: Verifying that pre-release flags, Docker tag protections, and GitHub Pages deployment blocks are fully functional.

## [1.14.0] - 2026-03-22

### Added
- Reusable Android publish workflow (`.github/workflows/publish-android.yml`) invoked by release orchestration to build and attach APK artifacts to GitHub Releases.

### Changed
- Release orchestration now invokes Android publishing from `auto-tag.yml` after signed tag/release creation.
- GHCR publish logic now avoids assigning the `latest` tag for prerelease SemVer versions.
- Android release artifact naming now explicitly marks the current CI output as a debug APK for initial testing.

## [1.13.0] - 2026-03-21

### Added
- Electron desktop packaging entrypoint (`electron-main.cjs`) for running the built app as a native window.
- Desktop packaging targets for Windows (`portable` `.exe`) and Linux (`AppImage`) via `electron-builder`.
- Reusable desktop publish workflow (`.github/workflows/publish-desktop.yml`) with matrix builds for Windows and Linux.

### Changed
- Release orchestration now invokes desktop publishing from `auto-tag.yml` after a signed tag/release is created.
- Release pipeline now uploads desktop binaries directly to GitHub Releases in addition to retaining CI artifacts.

## [1.12.1] - 2026-03-21

### Changed
- Adjusted release workflow chaining so Pages deploy and Docker publish run deterministically after an auto-created release tag.

## [1.12.0] - 2026-03-21

### Changed
- Refined mobile dpad visuals: center handle is now a solid circular control without a `+` marker.
- Reworked dpad divider rendering to preserve diagonal separators while keeping the center circle free of crossing lines.
- Moved mobile `Undo` and `Restart` action buttons above the dpad for improved thumb reach and visibility.
- Improved drag-handle accessibility labeling for touch controls.

## [1.11.2] - 2026-03-21

### Changed
- Implemented robust CI/CD pipeline with strict SemVer validation and automated Changelog extraction.
- Upgraded automated GitHub releases to include cryptographic GPG signatures for the Verified badge.

## [1.11.1] - 2026-03-20

### Fixed
- Preloaded all game assets from `src/assets` before app mount to avoid first-move sprite blinking (notably robot direction PNGs).
- Added a startup loading overlay so slow asset preloads no longer present a blank initial paint.

### Changed
- Startup loading indicator now uses global app styles, is centered in the viewport, and follows OS light/dark preference before in-app theme initialization.

## [1.11.0] - 2026-03-17

### Changed
- Updated core runtime/build dependencies to React 19 and Vite 8 (`react`, `react-dom`, `vite`, `@vitejs/plugin-react`).
- Updated TypeScript ecosystem support packages for the new stack (`@testing-library/*`, `@types/node`) and removed deprecated Jest type dependency.
- Switched TypeScript JSX emit mode to `react-jsx` for React 19-compatible JSX typing defaults.

### Verified
- Confirmed passing test suite with Vitest in containerized Node 24 (`10/10` tests passing).
- Confirmed production build success with TypeScript + Vite 8 in containerized Node 24.

## [1.10.1] - 2026-03-16

### Fixed
- Intercepted the `[` (Previous) and `]` (Next) keyboard shortcuts to trigger the same progress warning modal as the UI buttons, preventing accidental level skips via hotkeys.
- Migrated the test runner to Vitest and added specific test coverage for the level navigation guardrails.

## [1.10.0] - 2026-03-16

### Added
- Progress warning modal for level navigation (`Previous` / `Next`) to confirm before switching levels.

### Changed
- Intercept `Next` / `Previous` actions when the player has made moves and require confirmation.
- Reused the shared `Modal` component for the level-switch confirmation dialog to keep popup visuals identical.
- Added guards to protect in-level progress from accidental taps during navigation.

## [1.9.0] - 2026-03-15

### Added
- Mobile touch action buttons for `Undo` and `Restart`.
- Press-and-hold repeat support for mobile `Undo`.
- Restart confirmation dialog when level progress exists.
- Shared `Modal` component (`src/components/modal.tsx`) for consistent popup structure and close button behavior.

### Changed
- Mobile dpad visuals and hit targets were redesigned for better touch usability.
- Restart dialog keyboard behavior now defaults to `Cancel`; `Enter` activates focused action; `Escape` cancels.
- Desktop hold-to-repeat navigation buttons and mobile directional controls suppress long-press context menu behavior in Firefox device emulation.

### Fixed
- Restored draggable mobile controls after layout regression.
- Corrected center `+` handle placement within the dpad.
- Unified dialog close glyph and alignment across About and Restart dialogs.
- Improved restart warning text readability and spacing on small screens.

## [1.8.0] - 2026-03-15

### Added
- Mobile touch controls for directional movement (`#16`).
- Press-and-hold repeat behavior for directional controls with context-menu suppression (`#16`).
- GitHub issue templates (`bug_report.md`, `feature_request.md`) and pull request template (`#17`).

### Changed
- Project metadata in `package.json` (`description`, `author`, `contributors`, `repository`, `bugs`, `keywords`) (`#16`).
- UI polish for mobile controls: sizing, markers, button shapes, and interaction cleanup (`#16`).
- Documentation refresh in `README.md` to reflect architecture and new controls (`#16`).

## [1.7.0] - 2026-03-14

### Added
- Level completion overlay with congratulatory state (`#15`).

### Changed
- Top bar layout refactor to separate control area from game canvas (`#15`).
- Dynamic tile sizing and responsive board stability improvements across level sizes (`#15`).

## [1.6.0] - 2026-03-13

### Added
- Press-and-hold continuous level navigation for Previous/Next controls (`#14`).
- Pointer-event based repeat behavior with click-suppression for cross-device input consistency (`#14`).

### Changed
- About/help modal expanded with project and repository information (`#13`).
- CI pipeline chaining improved by invoking Docker publish from auto-tag workflow (`#12`).

## [1.5.2] - 2026-03-11

### Added
- In-app version display in About modal via injected `__APP_VERSION__` build variable (`#10`).
- Automated git-tag workflow when `package.json` version changes on `main` (`#10`).

### Changed
- Help modal text and styling refinements (`#11`).
- Version bumped to `1.5.2` (`#11`).

## [1.5.1] - 2026-03-11

### Changed
- Version bumped to `1.5.1` (`#9`).

## [1.5.0] - 2026-03-11

### Changed
- Responsive UI overhaul with improved board scaling and cleaner use of screen space (`#8`).
- About/help content moved into a toggleable modal (`#8`).
- Previous/Next level controls and keyboard shortcuts added for level navigation (`#8`).

## [1.4.1] - 2026-03-11

### Added
- Dark/light theme toggle and theme switching improvements (`#6`).

### Changed
- Renovate maintenance strategy optimized for weekend scheduling and grouped non-major updates (`#5`).
- Version bumped to `1.4.1` (`#7`).

## [1.4.0] - 2026-03-08

### Added
- Frontend modernization from CRA to Vite, with Dockerized production serving and GitHub Actions pipelines (`#1`).
- Docker Compose service isolation and dual environment improvements for local dev/prod testing (`#2`).
- Initial dark mode implementation and UI styling updates (`#3`).

### Changed
- Documentation updates for architecture, deployment, and local workflows (`#1`, `#2`, `#3`).
- Version bumped to `1.4.0` (`#4`).

## [1.3.0] - 2026-03-08

### Added
- Modernized frontend stack by replacing Create React App with Vite.
- Multi-stage Docker build and production Nginx runtime for static assets.
- Initial CI/CD workflows for container publishing, GitHub Pages deployment, and CodeQL analysis.

### Changed
- Preserved core gameplay scope (nearly 500 puzzles and unlimited undo) during the frontend/tooling migration.
- Updated documentation to reflect the modernized stack and local deployment flow.

## [Historical] - Pre-Fork

- This project was forked from the original upstream repository.
- Original project: https://github.com/ecyrbe/sokoban
- Original author: `ecyrbe`
- The original project did not maintain a changelog. For all changes prior to `v1.3.0`, please refer to the raw Git commit history.