import React from "react";
import style from "./sokoban.module.css";
import { cn } from "../utils/classnames";
import { ThemeMode, useTheme } from "../hooks/theme";

const MODE_OPTIONS: { id: ThemeMode; label: string }[] = [
    { id: "auto", label: "Auto" },
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
];

export function ThemeSwitcher() {
    const { mode, setMode, resolvedTheme } = useTheme();

    return (
        <div className={style.themeSwitcher}>
            <span className={style.themeSwitcherLabel}>Theme</span>
            <div className={style.themeSwitcherControls}>
                {MODE_OPTIONS.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        className={cn(
                            style.themeButton,
                            mode === option.id ? style.themeButtonActive : ""
                        )}
                        aria-pressed={mode === option.id}
                        onClick={() => setMode(option.id)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            <span className={style.themeHint}>
                {resolvedTheme === "dark" ? "Dark mode" : "Light mode"}
            </span>
        </div>
    );
}
