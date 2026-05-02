import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useKeyBoard } from "./keyboard";

afterEach(() => {
    cleanup();
});

test("listens to keydown events for configured key codes", () => {
    const callback = vi.fn();

    renderHook(() => useKeyBoard(callback, ["ArrowUp", "ArrowDown"]));

    fireEvent.keyDown(window, { code: "ArrowUp" });
    fireEvent.keyDown(window, { code: "ArrowDown" });
    fireEvent.keyDown(window, { code: "KeyA" });

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[0][0].code).toBe("ArrowUp");
    expect(callback.mock.calls[1][0].code).toBe("ArrowDown");
});

test("supports keyup-only mode", () => {
    const callback = vi.fn();

    renderHook(() =>
        useKeyBoard(callback, ["KeyK"], {
            keydown: false,
            keyup: true,
        })
    );

    fireEvent.keyDown(window, { code: "KeyK" });
    fireEvent.keyUp(window, { code: "KeyK" });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].type).toBe("keyup");
});

test("uses the latest callback after rerender", () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
        ({ callback }) => useKeyBoard(callback, ["KeyR"]),
        {
            initialProps: { callback: first },
        }
    );

    fireEvent.keyDown(window, { code: "KeyR" });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    rerender({ callback: second });
    fireEvent.keyDown(window, { code: "KeyR" });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
});

test("removes listeners on unmount", () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => useKeyBoard(callback, ["KeyQ"]));
    unmount();

    fireEvent.keyDown(window, { code: "KeyQ" });

    expect(callback).not.toHaveBeenCalled();
});
