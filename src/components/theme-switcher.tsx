import React from "react";
import style from "./sokoban.module.css";
import { useTheme } from "../hooks/theme";

export function ThemeSwitcher() {
    const { setMode, resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const handleToggle = () => {
        setMode(isDark ? "light" : "dark");
    };

    return (
        <div className={style.themeSwitcher}>
            <div className={style.themeSliderRow}>
                <input
                    id="theme-toggle"
                    className={style.themeToggleCheckbox}
                    type="checkbox"
                    checked={isDark}
                    onChange={handleToggle}
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                />
                <label htmlFor="theme-toggle" className={style.themeToggleLabel}>
                    <svg className={style.themeToggleMoon} viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M21 14.2A9 9 0 1 1 9.8 3a7 7 0 1 0 11.2 11.2Z"
                            fill="currentColor"
                        />
                    </svg>
                    <svg className={style.themeToggleSun} viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="4" fill="currentColor" />
                        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="12" y1="2" x2="12" y2="5" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                            <line x1="2" y1="12" x2="5" y2="12" />
                            <line x1="19" y1="12" x2="22" y2="12" />
                            <line x1="4.9" y1="4.9" x2="7" y2="7" />
                            <line x1="17" y1="17" x2="19.1" y2="19.1" />
                            <line x1="17" y1="7" x2="19.1" y2="4.9" />
                            <line x1="4.9" y1="19.1" x2="7" y2="17" />
                        </g>
                    </svg>
                    <span className={style.themeToggleBall} />
                </label>
            </div>
        </div>
    );
}
