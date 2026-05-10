import React from "react";
import style from "./sokoban.module.css";
import { ThemeSwitcher } from "./theme-switcher";

type HamburgerMenuProps = {
    open: boolean;
    showPlayStats: boolean;
    muted: boolean;
    volume: number;
    onMutedChange: (next: boolean) => void;
    onVolumeChange: (next: number) => void;
    onShowPlayStatsChange: (next: boolean) => void;
    onClose: () => void;
    onOpenLevelSelector: () => void;
    onOpenAbout: () => void;
};

function HamburgerMenuImpl({
    open,
    showPlayStats,
    muted,
    volume,
    onMutedChange,
    onVolumeChange,
    onShowPlayStatsChange,
    onClose,
    onOpenLevelSelector,
    onOpenAbout,
}: HamburgerMenuProps) {
    const [isSfxExpanded, setIsSfxExpanded] = React.useState(false);
    const controlsId = React.useId();
    const toggleId = React.useId();
    const sliderId = React.useId();
    const volumePercent = Math.round(volume * 100);

    React.useEffect(() => {
        if (!open) {
            setIsSfxExpanded(false);
        }
    }, [open]);

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

                    <div className={style.menuSfxItem}>
                        <button
                            type="button"
                            className={style.menuSfxToggleButton}
                            onClick={() => setIsSfxExpanded((current) => !current)}
                            aria-expanded={isSfxExpanded}
                            aria-controls={controlsId}
                        >
                            <span>SFX Settings</span>
                            <span className={style.menuSfxToggleState} aria-hidden="true">
                                {isSfxExpanded ? "Hide" : "Show"}
                            </span>
                        </button>

                        <div
                            id={controlsId}
                            className={`${style.menuSfxControls} ${isSfxExpanded ? style.menuSfxControlsOpen : ""}`}
                            aria-hidden={!isSfxExpanded}
                        >
                            <div className={style.menuSfxRow}>
                                <span className={style.menuSfxRowLabel}>Mute SFX</span>
                                <div className={style.themeSliderRow}>
                                    <input
                                        id={toggleId}
                                        className={style.themeToggleCheckbox}
                                        type="checkbox"
                                        checked={muted}
                                        onChange={(event) => onMutedChange(event.target.checked)}
                                        aria-label="Mute SFX"
                                    />
                                    <label htmlFor={toggleId} className={style.themeToggleLabel}>
                                        <span className={style.levelBestToggleOff} aria-hidden="true">Off</span>
                                        <span className={style.levelBestToggleOn} aria-hidden="true">On</span>
                                        <span className={style.themeToggleBall} />
                                    </label>
                                </div>
                            </div>

                            <div className={style.menuSfxRow}>
                                <span className={style.menuSfxRowLabel}>Volume</span>
                                <label htmlFor={sliderId} className={style.menuSfxVolumeLabel}>
                                    {volumePercent}%
                                </label>
                            </div>

                            <input
                                id={sliderId}
                                type="range"
                                className={style.menuSfxSlider}
                                min={0}
                                max={100}
                                step={5}
                                value={volumePercent}
                                aria-label="SFX volume"
                                onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
                                disabled={muted}
                            />
                        </div>
                    </div>

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