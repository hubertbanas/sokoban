import React from "react";
import style from "./sokoban.module.css";
import { ThemeSwitcher } from "./theme-switcher";

type HamburgerMenuProps = {
    open: boolean;
    showPlayStats: boolean;
    onShowPlayStatsChange: (next: boolean) => void;
    onClose: () => void;
    onOpenSfx: () => void;
    onOpenLevelSelector: () => void;
    onOpenAbout: () => void;
};

function HamburgerMenuImpl({
    open,
    showPlayStats,
    onShowPlayStatsChange,
    onClose,
    onOpenSfx,
    onOpenLevelSelector,
    onOpenAbout,
}: HamburgerMenuProps) {
    return (
        <>
            <div
                className={`${style.menuBackdrop} ${open ? style.menuBackdropOpen : ""}`}
                onClick={onClose}
                aria-hidden={!open}
            />

            <aside
                id="game-menu"
                role="dialog"
                aria-modal="true"
                aria-label="Game menu"
                aria-hidden={!open}
                className={`${style.menuDrawer} ${open ? style.menuDrawerOpen : ""}`}
            >
                <div className={style.menuDrawerHeader}>
                    <h2 className={style.menuDrawerTitle}>Menu</h2>
                    <button
                        type="button"
                        className={style.menuDrawerCloseButton}
                        onClick={onClose}
                        aria-label="Close menu"
                    >
                        X
                    </button>
                </div>

                <div className={style.menuSection}>
                    <div className={style.menuThemeRow}>
                        <span className={style.menuThemeLabel}>Theme</span>
                        <ThemeSwitcher />
                    </div>

                    <div className={style.menuThemeRow}>
                        <span className={style.menuThemeLabel}>Show Play Stats</span>
                        <div className={style.themeSliderRow}>
                            <input
                                id="play-stats-toggle"
                                className={style.themeToggleCheckbox}
                                type="checkbox"
                                checked={showPlayStats}
                                onChange={(event) => onShowPlayStatsChange(event.target.checked)}
                                aria-label={showPlayStats ? "Hide play stats" : "Show play stats"}
                            />
                            <label htmlFor="play-stats-toggle" className={style.themeToggleLabel}>
                                <span className={style.levelBestToggleOff} aria-hidden="true">Off</span>
                                <span className={style.levelBestToggleOn} aria-hidden="true">On</span>
                                <span className={style.themeToggleBall} />
                            </label>
                        </div>
                    </div>

                    <button type="button" className={style.menuItemButton} onClick={onOpenSfx}>
                        SFX Settings
                    </button>

                    <button type="button" className={style.menuItemButton} onClick={onOpenLevelSelector}>
                        Level Packs
                    </button>

                    <button type="button" className={style.menuItemButton} onClick={onOpenAbout}>
                        About
                    </button>
                </div>

                <div className={style.menuVersion}>Version {__APP_VERSION__}</div>
            </aside>
        </>
    );
}

export const HamburgerMenu = React.memo(HamburgerMenuImpl);