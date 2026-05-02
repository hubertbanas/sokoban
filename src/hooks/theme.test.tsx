import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor, cleanup, renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme";

type MatchMediaListener = (event: MediaQueryListEvent) => void;

type MatchMediaMock = {
    mql: MediaQueryList;
    emitChange: (matches: boolean) => void;
};

function createMatchMediaMock(initialMatches: boolean): MatchMediaMock {
    const listeners = new Set<MatchMediaListener>();

    const mql = {
        matches: initialMatches,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
            if (event !== "change") return;
            if (typeof listener === "function") {
                listeners.add(listener as MatchMediaListener);
            }
        }),
        removeEventListener: vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
            if (event !== "change") return;
            if (typeof listener === "function") {
                listeners.delete(listener as MatchMediaListener);
            }
        }),
        addListener: vi.fn((listener: MatchMediaListener) => {
            listeners.add(listener);
        }),
        removeListener: vi.fn((listener: MatchMediaListener) => {
            listeners.delete(listener);
        }),
        dispatchEvent: vi.fn(() => true),
    } as unknown as MediaQueryList;

    return {
        mql,
        emitChange: (matches: boolean) => {
            const event = { matches } as MediaQueryListEvent;
            (mql as { matches: boolean }).matches = matches;
            listeners.forEach((listener) => listener(event));
            if (typeof mql.onchange === "function") {
                mql.onchange(event);
            }
        },
    };
}

function ThemeProbe() {
    const { mode, resolvedTheme, setMode } = useTheme();

    return (
        <div>
            <output data-testid="mode">{mode}</output>
            <output data-testid="resolved-theme">{resolvedTheme}</output>
            <button type="button" onClick={() => setMode("dark")}>Dark</button>
            <button type="button" onClick={() => setMode("light")}>Light</button>
        </div>
    );
}

beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    document.querySelector('meta[name="theme-color"]')?.remove();

    const matchMediaMock = createMatchMediaMock(false);
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: vi.fn(() => matchMediaMock.mql),
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

test("useTheme throws outside ThemeProvider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });

    expect(() => renderHook(() => useTheme())).toThrowError(/useTheme must be used within a ThemeProvider/i);

    errorSpy.mockRestore();
});

test("uses stored theme mode and updates root attributes", () => {
    localStorage.setItem("sokoban-theme-mode", "dark");

    const themeMeta = document.createElement("meta");
    themeMeta.setAttribute("name", "theme-color");
    document.head.appendChild(themeMeta);

    const matchMediaMock = createMatchMediaMock(false);
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: vi.fn(() => matchMediaMock.mql),
    });

    render(
        <ThemeProvider>
            <ThemeProbe />
        </ThemeProvider>
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");

    expect(localStorage.getItem("sokoban-theme-mode")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(themeMeta.getAttribute("content")).toBe("#030712");

    fireEvent.click(screen.getByRole("button", { name: "Light" }));

    expect(screen.getByTestId("mode")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");

    expect(localStorage.getItem("sokoban-theme-mode")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(themeMeta.getAttribute("content")).toBe("#f8fafc");
});

test("auto mode reacts to matchMedia changes", async () => {
    localStorage.setItem("sokoban-theme-mode", "auto");

    const matchMediaMock = createMatchMediaMock(false);
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: vi.fn(() => matchMediaMock.mql),
    });

    render(
        <ThemeProvider>
            <ThemeProbe />
        </ThemeProvider>
    );

    await waitFor(() => {
        expect(screen.getByTestId("mode")).toHaveTextContent("auto");
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
    });

    act(() => {
        matchMediaMock.emitChange(true);
    });

    await waitFor(() => {
        expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
});
