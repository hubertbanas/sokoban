import React from "react";
import style from "./sokoban.module.css";
import { ThemeSwitcher } from "./theme-switcher";

type HamburgerMenuProps = {
    open: boolean;
    onClose: () => void;
    onOpenSfx: () => void;
    onOpenAbout: () => void;
};

function HamburgerMenuImpl({ open, onClose, onOpenSfx, onOpenAbout }: HamburgerMenuProps) {
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

                    <button type="button" className={style.menuItemButton} onClick={onOpenSfx}>
                        SFX Settings
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