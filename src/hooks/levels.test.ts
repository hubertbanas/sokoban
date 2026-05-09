import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { useLevels } from "./levels";

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