import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import {
    SOKOBAN_STATS_STORAGE_KEY,
    useStats,
    type SokobanStats,
} from "./useStats";

function readStoredStats(): SokobanStats {
    const raw = window.localStorage.getItem(SOKOBAN_STATS_STORAGE_KEY);
    if (!raw) {
        throw new Error("Expected stats payload in storage");
    }

    return JSON.parse(raw) as SokobanStats;
}

beforeEach(() => {
    window.localStorage.clear();
});

test("starts with empty stats when nothing is stored", () => {
    const { result } = renderHook(() => useStats());

    expect(result.current.stats.progression).toEqual({});
    expect(result.current.stats.records).toEqual({});
    expect(result.current.stats.version).toBe(1);
});

test("loads and sanitizes partially invalid stored payload", () => {
    window.localStorage.setItem(
        SOKOBAN_STATS_STORAGE_KEY,
        JSON.stringify({
            version: 999,
            updatedAt: 321,
            progression: {
                "Atlas01:0": {
                    playCount: "bad",
                    completionCount: 2,
                    isCompleted: true,
                    bestMovesInLevel: 120,
                    bestPushesInLevel: "bad",
                    bestTimeMsInLevel: 9000,
                    bestUndosInLevel: "bad",
                    lastPlayedAt: 100,
                    lastCompletedAt: 200,
                },
            },
            records: {
                abc12345: {
                    bestMoves: "bad",
                    bestTimeMs: 1000,
                    solveCount: 3,
                    firstSolvedAt: 10,
                    lastSolvedAt: 20,
                },
            },
        })
    );

    const { result } = renderHook(() => useStats());

    expect(result.current.stats.version).toBe(1);
    expect(result.current.stats.updatedAt).toBe(321);
    expect(result.current.stats.progression["Atlas01:0"]).toMatchObject({
        playCount: 0,
        completionCount: 2,
        isCompleted: true,
        bestMovesInLevel: 120,
        bestPushesInLevel: null,
        bestTimeMsInLevel: 9000,
        bestUndosInLevel: null,
    });
    expect(result.current.stats.records.abc12345).toBeUndefined();
});

test("saveLevelResult creates progression and records and persists", () => {
    const { result } = renderHook(() => useStats());

    act(() => {
        result.current.saveLevelResult({
            levelId: "Atlas01:0",
            puzzleId: "deadbeef",
            moves: 57,
            pushes: 11,
            timeMs: 12345,
            undos: 4,
            completedAt: 1000,
        });
    });

    expect(result.current.stats.progression["Atlas01:0"]).toMatchObject({
        playCount: 1,
        completionCount: 1,
        isCompleted: true,
        bestMovesInLevel: 57,
        bestPushesInLevel: 11,
        bestTimeMsInLevel: 12345,
        bestUndosInLevel: 4,
        lastPlayedAt: 1000,
        lastCompletedAt: 1000,
    });
    expect(result.current.stats.records.deadbeef).toMatchObject({
        bestMoves: 57,
        bestTimeMs: 12345,
        solveCount: 1,
        firstSolvedAt: 1000,
        lastSolvedAt: 1000,
    });

    const stored = readStoredStats();
    expect(stored.progression["Atlas01:0"].completionCount).toBe(1);
    expect(stored.records.deadbeef.bestMoves).toBe(57);
});

test("saveLevelResult keeps best metrics while counting plays", () => {
    const { result } = renderHook(() => useStats());

    act(() => {
        result.current.saveLevelResult({
            levelId: "Atlas01:0",
            puzzleId: "deadbeef",
            moves: 35,
            pushes: 14,
            timeMs: 9000,
            undos: 5,
            completedAt: 1000,
        });
    });

    act(() => {
        result.current.saveLevelResult({
            levelId: "Atlas01:0",
            puzzleId: "deadbeef",
            moves: 42,
            pushes: 12,
            timeMs: 8500,
            undos: 6,
            completedAt: 2000,
        });
    });

    expect(result.current.stats.progression["Atlas01:0"]).toMatchObject({
        playCount: 2,
        completionCount: 2,
        bestMovesInLevel: 35,
        bestPushesInLevel: 12,
        bestTimeMsInLevel: 8500,
        bestUndosInLevel: 5,
        lastCompletedAt: 2000,
    });
    expect(result.current.stats.records.deadbeef).toMatchObject({
        bestMoves: 35,
        bestTimeMs: 8500,
        solveCount: 2,
        firstSolvedAt: 1000,
        lastSolvedAt: 2000,
    });
});

test("shared puzzleId across different levels updates one global record", () => {
    const { result } = renderHook(() => useStats());

    act(() => {
        result.current.saveLevelResult({
            levelId: "Atlas01:0",
            puzzleId: "cafef00d",
            moves: 50,
            timeMs: 11000,
            completedAt: 1000,
        });
    });

    act(() => {
        result.current.saveLevelResult({
            levelId: "Atlas02:4",
            puzzleId: "cafef00d",
            moves: 45,
            timeMs: 12000,
            completedAt: 1500,
        });
    });

    expect(result.current.stats.progression["Atlas01:0"].completionCount).toBe(1);
    expect(result.current.stats.progression["Atlas02:4"].completionCount).toBe(1);
    expect(result.current.stats.records.cafef00d).toMatchObject({
        bestMoves: 45,
        bestTimeMs: 11000,
        solveCount: 2,
    });
});

test("clearStats removes in-memory and localStorage stats", () => {
    const { result } = renderHook(() => useStats());

    act(() => {
        result.current.saveLevelResult({
            levelId: "Atlas01:0",
            puzzleId: "deadbeef",
            moves: 57,
            timeMs: 12345,
            completedAt: 1000,
        });
    });

    expect(window.localStorage.getItem(SOKOBAN_STATS_STORAGE_KEY)).not.toBeNull();

    act(() => {
        result.current.clearStats();
    });

    expect(result.current.stats.progression).toEqual({});
    expect(result.current.stats.records).toEqual({});
    expect(window.localStorage.getItem(SOKOBAN_STATS_STORAGE_KEY)).toBeNull();
});