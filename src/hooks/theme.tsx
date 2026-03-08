import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

type ThemeMode = "auto" | "dark" | "light";
type Theme = "dark" | "light";

const STORAGE_KEY = "sokoban-theme-mode";
const DEFAULT_MODE: ThemeMode = "auto";

const envDefaultTheme: Theme | null = (() => {
    const value = import.meta.env.VITE_DEFAULT_THEME?.toLowerCase();
    if (value === "dark") {
        return "dark";
    }
    if (value === "light") {
        return "light";
    }
    return null;
})();

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeContextValue = {
    mode: ThemeMode;
    resolvedTheme: Theme;
    setMode: (mode: ThemeMode) => void;
};

const parseMode = (value: string | null): ThemeMode => {
    if (value === "dark" || value === "light" || value === "auto") {
        return value;
    }
    return DEFAULT_MODE;
};

const getInitialMode = (): ThemeMode => {
    if (typeof window === "undefined") {
        return DEFAULT_MODE;
    }
    return parseMode(window.localStorage.getItem(STORAGE_KEY));
};

const usePrefersDark = (): boolean => {
    const getCurrent = () => {
        if (typeof window === "undefined") {
            return false;
        }
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };

    const [prefersDark, setPrefersDark] = useState<boolean>(getCurrent);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersDark(event.matches);
        };

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", handleChange);
            return () => mediaQuery.removeEventListener("change", handleChange);
        }

        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, []);

    return prefersDark;
};

export function ThemeProvider({
    children,
}: {
    children: ReactNode;
}): JSX.Element {
    const [mode, setMode] = useState<ThemeMode>(getInitialMode);
    const prefersDark = usePrefersDark();

    const resolvedTheme = useMemo<Theme>(() => {
        if (mode === "dark") {
            return "dark";
        }
        if (mode === "light") {
            return "light";
        }
        if (envDefaultTheme) {
            return envDefaultTheme;
        }
        return prefersDark ? "dark" : "light";
    }, [mode, prefersDark]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        window.localStorage.setItem(STORAGE_KEY, mode);
    }, [mode]);

    useEffect(() => {
        if (typeof document === "undefined") {
            return;
        }
        const root = document.documentElement;
        root.setAttribute("data-theme", resolvedTheme);
        root.style.colorScheme = resolvedTheme;
        const themeColor = resolvedTheme === "dark" ? "#030712" : "#f8fafc";
        const metaTheme = document.querySelector("meta[name=\"theme-color\"]");
        if (metaTheme) {
            metaTheme.setAttribute("content", themeColor);
        }
    }, [resolvedTheme]);

    const handleModeChange = useCallback((next: ThemeMode) => {
        setMode(next);
    }, []);

    return (
        <ThemeContext.Provider
            value={{ mode, resolvedTheme, setMode: handleModeChange }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};

export type { ThemeMode, Theme };
