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

function renderMenu(open = true, showPlayStats = false) {
    const onClose = vi.fn();
    const onShowPlayStatsChange = vi.fn();
    const onResetStats = vi.fn();
    const onMutedChange = vi.fn();
    const onVolumeChange = vi.fn();
    const onOpenLevelSelector = vi.fn();
    const onOpenAbout = vi.fn();

    const view = render(
        <HamburgerMenu
            open={open}
            showPlayStats={showPlayStats}
            muted={false}
            volume={1}
            onMutedChange={onMutedChange}
            onVolumeChange={onVolumeChange}
            onShowPlayStatsChange={onShowPlayStatsChange}
            onResetStats={onResetStats}
            onClose={onClose}
            onOpenLevelSelector={onOpenLevelSelector}
            onOpenAbout={onOpenAbout}
        />
    );

    return {
        ...view,
        onClose,
        onShowPlayStatsChange,
        onResetStats,
        onMutedChange,
        onVolumeChange,
        onOpenLevelSelector,
        onOpenAbout,
    };
}

test("renders menu content and version", () => {
    const { getByRole, getByText, getByTestId } = renderMenu(true);

    expect(getByRole("dialog", { name: /game menu/i })).toBeInTheDocument();
    expect(getByText("Theme")).toBeInTheDocument();
    expect(getByTestId("theme-switcher")).toBeInTheDocument();
    expect(getByRole("button", { name: /show play stats/i })).toBeInTheDocument();
    expect(() => getByRole("checkbox", { name: /show play stats/i })).toThrow();
    expect(() => getByRole("button", { name: /reset stats/i })).toThrow();
    expect(getByRole("button", { name: /sfx settings/i })).toBeInTheDocument();
    expect(() => getByRole("slider", { name: /sfx volume/i })).toThrow();
    expect(() => getByRole("checkbox", { name: /mute sfx/i })).toThrow();
    expect(getByRole("button", { name: /level packs/i })).toBeInTheDocument();
    expect(getByRole("button", { name: /^about$/i })).toBeInTheDocument();
    expect(getByText(/version\s+1\.2\.3-test/i)).toBeInTheDocument();
});

test("shows checked play stats toggle with hide aria label when enabled", () => {
    const { getByRole } = renderMenu(true, true);

    fireEvent.click(getByRole("button", { name: /show play stats/i }));
    expect(getByRole("checkbox", { name: /hide play stats/i })).toBeChecked();
});

test("applies open and hidden states based on open prop", () => {
    const {
        rerender,
        container,
        onClose,
        onMutedChange,
        onVolumeChange,
        onShowPlayStatsChange,
        onResetStats,
        onOpenAbout,
        onOpenLevelSelector,
    } = renderMenu(false);

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
            showPlayStats={false}
            muted={false}
            volume={1}
            onMutedChange={onMutedChange}
            onVolumeChange={onVolumeChange}
            onShowPlayStatsChange={onShowPlayStatsChange}
            onResetStats={onResetStats}
            onClose={onClose}
            onOpenLevelSelector={onOpenLevelSelector}
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
    const {
        container,
        getByRole,
        getByText,
        onClose,
        onMutedChange,
        onVolumeChange,
        onShowPlayStatsChange,
        onResetStats,
        onOpenLevelSelector,
        onOpenAbout,
    } = renderMenu(true);

    const backdrop = container.querySelector(`.${style.menuBackdrop}`);
    if (!backdrop) {
        throw new Error("Expected menu backdrop element");
    }

    fireEvent.click(backdrop);
    fireEvent.click(getByRole("button", { name: /close menu/i }));
    fireEvent.click(getByRole("button", { name: /show play stats/i }));
    fireEvent.click(getByRole("checkbox", { name: /show play stats/i }));
    fireEvent.click(getByRole("button", { name: /reset stats/i }));
    fireEvent.click(getByRole("button", { name: /sfx settings/i }));
    expect(getByRole("checkbox", { name: /mute sfx/i })).toBeInTheDocument();
    expect(getByText("Volume")).toBeInTheDocument();
    fireEvent.click(getByRole("checkbox", { name: /mute sfx/i }));
    fireEvent.change(getByRole("slider", { name: /sfx volume/i }), { target: { value: "65" } });
    fireEvent.click(getByRole("button", { name: /level packs/i }));
    fireEvent.click(getByRole("button", { name: /^about$/i }));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onShowPlayStatsChange).toHaveBeenCalledWith(true);
    expect(onResetStats).toHaveBeenCalledTimes(1);
    expect(onMutedChange).toHaveBeenCalledWith(true);
    expect(onVolumeChange).toHaveBeenCalledWith(0.65);
    expect(onOpenLevelSelector).toHaveBeenCalledTimes(1);
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
});
