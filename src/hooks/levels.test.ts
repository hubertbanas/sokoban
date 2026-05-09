import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { SOKOBAN_LEVEL_STORAGE_KEY, useLevels } from "./levels";

beforeEach(() => {
    localStorage.clear();
});

test("previous/next wrap inside the current pack", () => {
    const { result } = renderHook(() => useLevels());

    const targetPack = result.current.levelPacks.find((pack) => pack.levels.length > 0);
    if (!targetPack) {
        throw new Error("Expected at least one non-empty level pack");
    }

    const firstLevelId = targetPack.levels[0].levelId;
    const lastLevelId = targetPack.levels[targetPack.levels.length - 1].levelId;

    act(() => {
        result.current.loadLevel(firstLevelId);
    });

    act(() => {
        result.current.loadPrevious();
    });

    expect(result.current.level.levelId).toBe(lastLevelId);
    expect(result.current.level.packId).toBe(targetPack.packId);

    act(() => {
        result.current.loadNext();
    });

    expect(result.current.level.levelId).toBe(firstLevelId);
    expect(result.current.level.packId).toBe(targetPack.packId);
});

test("selecting another pack changes next/previous scope to that pack", () => {
    const { result } = renderHook(() => useLevels());

    const nonEmptyPacks = result.current.levelPacks.filter((pack) => pack.levels.length > 0);
    expect(nonEmptyPacks.length).toBeGreaterThan(1);

    const secondPack = nonEmptyPacks[1];
    const secondPackFirstLevelId = secondPack.levels[0].levelId;
    const secondPackLastLevelId = secondPack.levels[secondPack.levels.length - 1].levelId;

    act(() => {
        result.current.loadLevel(secondPackFirstLevelId);
    });

    act(() => {
        result.current.loadPrevious();
    });

    expect(result.current.level.levelId).toBe(secondPackLastLevelId);
    expect(result.current.level.packId).toBe(secondPack.packId);
});

test("restores level from persisted levelId", () => {
    const initial = renderHook(() => useLevels());
    const nonEmptyPack = initial.result.current.levelPacks.find((pack) => pack.levels.length > 0);
    if (!nonEmptyPack) {
        throw new Error("Expected at least one non-empty level pack");
    }

    const targetLevel = nonEmptyPack.levels[Math.min(1, nonEmptyPack.levels.length - 1)];
    initial.unmount();

    localStorage.setItem(SOKOBAN_LEVEL_STORAGE_KEY, targetLevel.levelId);

    const { result } = renderHook(() => useLevels());
    expect(result.current.level.levelId).toBe(targetLevel.levelId);
});

test("ignores legacy SokobanLevel key when new levelId key is absent", () => {
    const baseline = renderHook(() => useLevels());
    const expectedInitialLevelId = baseline.result.current.level.levelId;
    baseline.unmount();

    localStorage.clear();
    localStorage.setItem("SokobanLevel", "9999");

    const { result } = renderHook(() => useLevels());
    expect(result.current.level.levelId).toBe(expectedInitialLevelId);
});

test("persists levelId when navigating next and previous", () => {
    const { result } = renderHook(() => useLevels());

    act(() => {
        result.current.loadNext();
    });

    expect(localStorage.getItem(SOKOBAN_LEVEL_STORAGE_KEY)).toBe(result.current.level.levelId);

    act(() => {
        result.current.loadPrevious();
    });

    expect(localStorage.getItem(SOKOBAN_LEVEL_STORAGE_KEY)).toBe(result.current.level.levelId);
});

test("persists selected levelId when loading a specific level", () => {
    const { result } = renderHook(() => useLevels());
    const nonEmptyPack = result.current.levelPacks.find((pack) => pack.levels.length > 0);
    if (!nonEmptyPack) {
        throw new Error("Expected at least one non-empty level pack");
    }

    const targetLevel = nonEmptyPack.levels[Math.min(1, nonEmptyPack.levels.length - 1)];

    act(() => {
        result.current.loadLevel(targetLevel.levelId);
    });

    expect(localStorage.getItem(SOKOBAN_LEVEL_STORAGE_KEY)).toBe(targetLevel.levelId);
    expect(result.current.level.levelId).toBe(targetLevel.levelId);
});