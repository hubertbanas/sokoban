# Changelog

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
