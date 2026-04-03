import "@testing-library/jest-dom/vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { beforeAll, afterEach, expect, test, vi } from "vitest";
import { Help } from "./help";
import { ThemeSwitcher } from "./theme-switcher";
import { MobileControls } from "./mobile-controls";
import { ThemeProvider } from "../hooks/theme";
import style from "./sokoban.module.css";

const cssText = readFileSync(resolve(process.cwd(), "src/components/sokoban.module.css"), "utf-8");
const styleMap = style as Record<string, string>;

function hasUserSelectNone(className: string) {
    const ruleRegex = new RegExp(`\\.${className}[\\s\\S]*?{[\\s\\S]*?}`, "g");
    const matches = cssText.match(ruleRegex) ?? [];
    return matches.some((rule) => /user-select\s*:\s*none/.test(rule));
}

function ensurePointerCapture(element: Element) {
    const target = element as { setPointerCapture?: (id: number) => void; releasePointerCapture?: (id: number) => void };
    if (!target.setPointerCapture) {
        target.setPointerCapture = vi.fn();
    }
    if (!target.releasePointerCapture) {
        target.releasePointerCapture = vi.fn();
    }
}

beforeAll(() => {
    (globalThis as { __APP_VERSION__?: string }).__APP_VERSION__ = "test";

    if (!window.matchMedia) {
        Object.defineProperty(window, "matchMedia", {
            writable: true,
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                addListener: vi.fn(),
                removeListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    }
});

afterEach(() => {
    cleanup();
});

test("about and modal close buttons keep selection disabled", () => {
    render(<Help />);

    const aboutButton = screen.getByRole("button", { name: "About" });
    fireEvent.pointerDown(aboutButton, { button: 0, pointerId: 1 });
    expect(aboutButton).toHaveClass(style.aboutButton);
    expect(hasUserSelectNone("aboutButton")).toBe(true);

    fireEvent.click(aboutButton);
    const closeButton = screen.getByRole("button", { name: "Close" });
    fireEvent.pointerDown(closeButton, { button: 0, pointerId: 2 });
    expect(closeButton).toHaveClass(style.modalCloseButton);
    expect(hasUserSelectNone("modalCloseButton")).toBe(true);
});

test("theme toggle label keeps selection disabled", () => {
    const { container } = render(
        <ThemeProvider>
            <ThemeSwitcher />
        </ThemeProvider>
    );

    const label = container.querySelector(`.${style.themeToggleLabel}`);
    if (!label) {
        throw new Error("Expected theme toggle label to be rendered");
    }

    fireEvent.pointerDown(label, { button: 0, pointerId: 1 });
    expect(label).toHaveClass(style.themeToggleLabel);
    expect(hasUserSelectNone("themeToggleLabel")).toBe(true);
});

test("mobile control buttons keep selection disabled", () => {
    render(
        <MobileControls
            onMove={vi.fn()}
            onUndo={vi.fn()}
            onRestart={vi.fn()}
        />
    );

    const undoButton = screen.getByRole("button", { name: /undo move/i });
    const restartButton = screen.getByRole("button", { name: /restart level/i });
    const moveUpButton = screen.getByRole("button", { name: /move up/i });
    const moveLeftButton = screen.getByRole("button", { name: /move left/i });
    const moveRightButton = screen.getByRole("button", { name: /move right/i });
    const moveDownButton = screen.getByRole("button", { name: /move down/i });
    const handleButton = screen.getByRole("button", { name: /drag to move controls/i });

    const buttonCases = [
        { element: undoButton, className: "mobileControlActionButton" },
        { element: restartButton, className: "mobileControlActionButton" },
        { element: moveUpButton, className: "mobileControlButton" },
        { element: moveLeftButton, className: "mobileControlButton" },
        { element: moveRightButton, className: "mobileControlButton" },
        { element: moveDownButton, className: "mobileControlButton" },
        { element: handleButton, className: "mobileControlHandle" },
    ];

    expect(hasUserSelectNone("mobileControlActionButton")).toBe(true);
    expect(hasUserSelectNone("mobileControlButton")).toBe(true);
    expect(hasUserSelectNone("mobileControlHandle")).toBe(true);

    buttonCases.forEach((entry, index) => {
        ensurePointerCapture(entry.element);
        fireEvent.pointerDown(entry.element, { button: 0, pointerId: index + 1 });
        expect(entry.element).toHaveClass(styleMap[entry.className]);
    });
});
