# Sokoban

[![Latest Release](https://img.shields.io/github/v/release/hubertbanas/sokoban?display_name=tag&sort=semver)](https://github.com/hubertbanas/sokoban/releases/latest)

Sokoban is a classic box-pushing puzzle game with 493 built-in levels across six packs.

Play in your browser: https://hubertbanas.github.io/sokoban/

![Sokoban dark theme](docs/assets/screenshot-gameplay-mobile-dark.png)

### Which file should I download?

Click the [**Latest Release**](https://github.com/hubertbanas/sokoban/releases/latest), scroll to the `Assets` section, and download the file for your system:

| Operating System | Download This File |
| :--- | :--- |
| **Windows (Universal)** | `Sokoban-<version>-setup.exe` |
| **Linux (Universal)** | `Sokoban-<version>-x86_64.AppImage` |
| **Mac (Apple Silicon)** | `Sokoban-<version>-arm64.dmg` |
| **Mac (Intel)** | `Sokoban-<version>-x64.dmg` |
| **Android** | `Sokoban-<version>.apk` |
| **iOS Simulator (macOS)** | `Sokoban-<version>-ios-simulator.zip` |

*(Note: The iOS Simulator asset works only in Xcode Simulator on macOS and cannot be installed on a physical iPhone. Power users can find portable `.exe` files and native Linux packages like `.deb`, `.rpm`, and `.flatpak` in the full assets list).*

## Quick Controls

- `Arrow keys`: Move
- `Backspace`: Undo
- `Escape`: Restart current level
- `[` / `]`: Previous / Next level

## Languages

The game UI is currently available in:

- English (`en`)
- Polish (`pl`)
- Spanish (`es`)
- French (`fr`)
- Portuguese, Brazil (`pt-BR`)
- German (`de`)
- Italian (`it`)
- Chinese, Simplified (`zh-CN`)
- Japanese (`ja`)
- Korean (`ko`)
- Russian (`ru`)
- Ukrainian (`uk`)

## Translations

Translations for this project are hosted by [Weblate](https://weblate.org/).
If you would like to help translate Sokoban into your language, please visit the [Sokoban Weblate project](https://hosted.weblate.org/projects/sokoban/).

## Statistics

- The game UI can show statistics in two places via `Menu -> Play Stats`.
- `Menu -> Play Stats -> While playing` toggles the compact table above the board.
- `Menu -> Play Stats -> After finishing a level` toggles stats in the completion dialog.
- Both visibility toggles are off by default to keep the HUD minimal.
- `Menu -> Play Stats -> Reset Stats` opens a confirmation and then clears saved play statistics.
- When enabled, the stats table shows:
	- `Current` and `Best` rows.
	- Columns for `Moves`, `Pushes`, `Undos`, and `Time`.

## More Information

- More screenshots: [Screenshots](docs/screenshots.md)
- Technical and development docs: [Development & Technical Notes](docs/development.md)
- Developers should start with `./scripts/build-releases.sh` (details in the technical notes).

## Attribution

- Game graphics: [Kenney.nl Sokoban Asset Pack](https://kenney.nl/assets/sokoban) under the [CC0 1.0 Universal (Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/) license
- Original project: https://github.com/ecyrbe/sokoban
- Current repository: https://github.com/hubertbanas/sokoban

## License

MIT. See `LICENSE`.

## Changelog

See `CHANGELOG.md` for project history and recent updates.
