import React from "react";
import { useTranslation } from "react-i18next";
import style from "./sokoban.module.css";
import { ThemeSwitcher } from "./theme-switcher";

const BASE_SELECTABLE_LANGUAGES = ["en", "pl", "es", "fr"] as const;
const SELECTABLE_LANGUAGES = import.meta.env.DEV
    ? ([...BASE_SELECTABLE_LANGUAGES, "en-xa"] as const)
    : BASE_SELECTABLE_LANGUAGES;

type HamburgerMenuProps = {
    open: boolean;
    showPlayStats: boolean;
    muted: boolean;
    volume: number;
    onMutedChange: (next: boolean) => void;
    onVolumeChange: (next: number) => void;
    onShowPlayStatsChange: (next: boolean) => void;
    onResetStats: () => void;
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
    onResetStats,
    onClose,
    onOpenLevelSelector,
    onOpenAbout,
}: HamburgerMenuProps) {
    const { t, i18n } = useTranslation();
    const [isStatsExpanded, setIsStatsExpanded] = React.useState(false);
    const [isSfxExpanded, setIsSfxExpanded] = React.useState(false);
    const statsControlsId = React.useId();
    const statsToggleId = React.useId();
    const sfxControlsId = React.useId();
    const sfxToggleId = React.useId();
    const sfxSliderId = React.useId();
    const volumePercent = Math.round(volume * 100);
    const playStatsToggleLabel = showPlayStats ? t("menu.playStats.disable") : t("menu.playStats.enable");
    const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? "en").toLowerCase();
    const matchedLanguage = SELECTABLE_LANGUAGES.find(
        (languageCode) =>
            currentLanguage === languageCode || currentLanguage.startsWith(`${languageCode}-`)
    );
    const selectedLanguage = matchedLanguage ?? "en";

    React.useEffect(() => {
        if (!open) {
            setIsStatsExpanded(false);
            setIsSfxExpanded(false);
        }
    }, [open]);

    React.useEffect(() => {
        if (!import.meta.env.DEV && currentLanguage.startsWith("en-xa")) {
            void i18n.changeLanguage("en");
        }
    }, [currentLanguage, i18n]);

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
                aria-label={t("menu.ariaLabel")}
                aria-hidden={!open}
                className={`${style.menuDrawer} ${open ? style.menuDrawerOpen : ""}`}
            >
                <div className={style.menuDrawerHeader}>
                    <h2 className={style.menuDrawerTitle}>{t("menu.title")}</h2>
                    <button
                        type="button"
                        className={style.menuDrawerCloseButton}
                        onClick={onClose}
                        aria-label={t("game.menu.close")}
                    >
                        X
                    </button>
                </div>

                <div className={style.menuSection}>
                    <div className={style.menuThemeRow}>
                        <span className={style.menuThemeLabel}>{t("menu.theme")}</span>
                        <ThemeSwitcher />
                    </div>

                    <div className={style.menuThemeRow}>
                        <span className={style.menuThemeLabel}>{t("menu.language.label")}</span>
                        <select
                            className={style.menuLanguageSelect}
                            value={selectedLanguage}
                            onChange={(event) => {
                                void i18n.changeLanguage(event.target.value);
                            }}
                            aria-label={t("menu.language.label")}
                        >
                            {SELECTABLE_LANGUAGES.map((languageCode) => (
                                <option key={languageCode} value={languageCode}>
                                    {t(`menu.language.options.${languageCode}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={style.menuSfxItem}>
                        <button
                            type="button"
                            className={style.menuSfxToggleButton}
                            onClick={() => setIsStatsExpanded((current) => !current)}
                            aria-expanded={isStatsExpanded}
                            aria-controls={statsControlsId}
                        >
                            <span>{t("menu.playStats.title")}</span>
                            <span className={style.menuSfxToggleState} aria-hidden="true">
                                {isStatsExpanded ? t("common.hide") : t("common.show")}
                            </span>
                        </button>

                        <div
                            id={statsControlsId}
                            className={`${style.menuSfxControls} ${isStatsExpanded ? style.menuSfxControlsOpen : ""}`}
                            aria-hidden={!isStatsExpanded}
                        >
                            <div className={style.menuSfxRow}>
                                <span className={style.menuSfxRowLabel}>{t("menu.playStats.visible")}</span>
                                <div className={style.themeSliderRow}>
                                    <input
                                        id={statsToggleId}
                                        className={style.themeToggleCheckbox}
                                        type="checkbox"
                                        checked={showPlayStats}
                                        onChange={(event) => onShowPlayStatsChange(event.target.checked)}
                                        aria-label={playStatsToggleLabel}
                                    />
                                    <label htmlFor={statsToggleId} className={style.themeToggleLabel}>
                                        <span className={style.levelBestToggleOff} aria-hidden="true">{t("common.off")}</span>
                                        <span className={style.levelBestToggleOn} aria-hidden="true">{t("common.on")}</span>
                                        <span className={style.themeToggleBall} />
                                    </label>
                                </div>
                            </div>

                            <button
                                type="button"
                                className={`${style.menuItemButton} ${style.menuResetStatsButton}`}
                                onClick={onResetStats}
                            >
                                {t("menu.playStats.reset")}
                            </button>
                        </div>
                    </div>

                    <div className={style.menuSfxItem}>
                        <button
                            type="button"
                            className={style.menuSfxToggleButton}
                            onClick={() => setIsSfxExpanded((current) => !current)}
                            aria-expanded={isSfxExpanded}
                            aria-controls={sfxControlsId}
                        >
                            <span>{t("menu.sfx.title")}</span>
                            <span className={style.menuSfxToggleState} aria-hidden="true">
                                {isSfxExpanded ? t("common.hide") : t("common.show")}
                            </span>
                        </button>

                        <div
                            id={sfxControlsId}
                            className={`${style.menuSfxControls} ${isSfxExpanded ? style.menuSfxControlsOpen : ""}`}
                            aria-hidden={!isSfxExpanded}
                        >
                            <div className={style.menuSfxRow}>
                                <span className={style.menuSfxRowLabel}>{t("menu.sfx.mute")}</span>
                                <div className={style.themeSliderRow}>
                                    <input
                                        id={sfxToggleId}
                                        className={style.themeToggleCheckbox}
                                        type="checkbox"
                                        checked={muted}
                                        onChange={(event) => onMutedChange(event.target.checked)}
                                        aria-label={t("menu.sfx.mute")}
                                    />
                                    <label htmlFor={sfxToggleId} className={style.themeToggleLabel}>
                                        <span className={style.levelBestToggleOff} aria-hidden="true">{t("common.off")}</span>
                                        <span className={style.levelBestToggleOn} aria-hidden="true">{t("common.on")}</span>
                                        <span className={style.themeToggleBall} />
                                    </label>
                                </div>
                            </div>

                            <div className={style.menuSfxRow}>
                                <span className={style.menuSfxRowLabel}>{t("menu.sfx.volume")}</span>
                                <label htmlFor={sfxSliderId} className={style.menuSfxVolumeLabel}>
                                    {volumePercent}%
                                </label>
                            </div>

                            <input
                                id={sfxSliderId}
                                type="range"
                                className={style.menuSfxSlider}
                                min={0}
                                max={100}
                                step={5}
                                value={volumePercent}
                                aria-label={t("menu.sfx.volumeAria")}
                                onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
                                disabled={muted}
                            />
                        </div>
                    </div>

                    <button type="button" className={style.menuItemButton} onClick={onOpenLevelSelector}>
                        {t("common.levelPacks")}
                    </button>

                    <button type="button" className={style.menuItemButton} onClick={onOpenAbout}>
                        {t("common.about")}
                    </button>
                </div>

                <div className={style.menuVersion}>{t("common.version", { version: __APP_VERSION__ })}</div>
            </aside>
        </>
    );
}

export const HamburgerMenu = React.memo(HamburgerMenuImpl);