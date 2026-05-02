import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { HamburgerMenu } from "./hamburger-menu";
import style from "./sokoban.module.css";

vi.mock("./theme-switcher", () => ({
    ThemeSwitcher: () => <div data-testid="theme-switcher">Theme switcher</div>,
}));

beforeAll(() => {
    (globalThis as { __APP_VERSION__?: string }).__APP_VERSION__ = "1.2.3-test";
});

afterEach(() => {
    cleanup();
});

function renderMenu(open = true) {
    const onClose = vi.fn();
    const onOpenSfx = vi.fn();
    const onOpenAbout = vi.fn();

    const view = render(
        <HamburgerMenu
            open={open}
            onClose={onClose}
            onOpenSfx={onOpenSfx}
            onOpenAbout={onOpenAbout}
        />
    );

    return {
        ...view,
        onClose,
        onOpenSfx,
        onOpenAbout,
    };
}

test("renders menu content and version", () => {
    const { getByRole, getByText, getByTestId } = renderMenu(true);

    expect(getByRole("dialog", { name: /game menu/i })).toBeInTheDocument();
    expect(getByText("Theme")).toBeInTheDocument();
    expect(getByTestId("theme-switcher")).toBeInTheDocument();
    expect(getByRole("button", { name: /sfx settings/i })).toBeInTheDocument();
    expect(getByRole("button", { name: /^about$/i })).toBeInTheDocument();
    expect(getByText(/version\s+1\.2\.3-test/i)).toBeInTheDocument();
});

test("applies open and hidden states based on open prop", () => {
    const { rerender, container, onClose, onOpenAbout, onOpenSfx } = renderMenu(false);

    let drawer = container.querySelector("#game-menu");
    if (!drawer) {
        throw new Error("Expected menu drawer element");
    }

    expect(drawer).toHaveAttribute("aria-hidden", "true");
    expect(drawer).not.toHaveClass(style.menuDrawerOpen);

    let backdrop = container.querySelector(`.${style.menuBackdrop}`);
    if (!backdrop) {
        throw new Error("Expected menu backdrop element");
    }

    expect(backdrop).not.toHaveClass(style.menuBackdropOpen);

    rerender(
        <HamburgerMenu
            open
            onClose={onClose}
            onOpenSfx={onOpenSfx}
            onOpenAbout={onOpenAbout}
        />
    );

    drawer = container.querySelector("#game-menu");
    if (!drawer) {
        throw new Error("Expected menu drawer element after rerender");
    }

    backdrop = container.querySelector(`.${style.menuBackdrop}`);
    if (!backdrop) {
        throw new Error("Expected menu backdrop element after rerender");
    }

    expect(drawer).toHaveAttribute("aria-hidden", "false");
    expect(drawer).toHaveClass(style.menuDrawerOpen);
    expect(backdrop).toHaveClass(style.menuBackdropOpen);
});

test("menu actions call the expected callbacks", () => {
    const { container, getByRole, onClose, onOpenSfx, onOpenAbout } = renderMenu(true);

    const backdrop = container.querySelector(`.${style.menuBackdrop}`);
    if (!backdrop) {
        throw new Error("Expected menu backdrop element");
    }

    fireEvent.click(backdrop);
    fireEvent.click(getByRole("button", { name: /close menu/i }));
    fireEvent.click(getByRole("button", { name: /sfx settings/i }));
    fireEvent.click(getByRole("button", { name: /^about$/i }));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onOpenSfx).toHaveBeenCalledTimes(1);
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
});
