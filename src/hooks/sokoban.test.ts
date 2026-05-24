import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useSokoban, Direction, State, type MoveOutcome } from "./sokoban";
import { Block, useLevels, type Level } from "./levels";

vi.mock("./levels", async () => {
    const actual = await vi.importActual<typeof import("./levels")>("./levels");
    return {
        ...actual,
        useLevels: vi.fn(),
    };
});

const mockedUseLevels = vi.mocked(useLevels);

function createLevel(shape: Block[][]): Level {
    return {
        packId: "test-pack",
        levelId: "test-pack:0",
        puzzleId: "test-puzzle-id",
        name: "Blocked orientation regression",
        width: shape[0].length,
        height: shape.length,
        shape,
    };
}

beforeEach(() => {
    mockedUseLevels.mockReset();
    localStorage.clear();
});

afterEach(() => {
    vi.useRealTimers();
});

test("blocked movement updates player orientation without moving or adding progress", () => {
    const level = createLevel([
        [Block.wall, Block.wall, Block.wall],
        [Block.wall, Block.player, Block.wall],
        [Block.wall, Block.empty, Block.wall],
    ]);

    mockedUseLevels.mockReturnValue({
        index: 0,
        level,
        levelPacks: [
            {
                packId: "test-pack",
                title: "Test Pack",
                description: "",
                email: "",
                levels: [level],
            },
        ],
        loadNext: vi.fn(),
        loadPrevious: vi.fn(),
        loadLevel: vi.fn(),
        totalLevels: 1,
    });

    const { result } = renderHook(() => useSokoban());

    expect(result.current.level.playerDirection).toBe(Direction.Right);
    expect(result.current.level.playerPosition).toEqual({ row: 1, column: 1 });
    expect(result.current.hasProgress).toBe(false);
    expect(result.current.moveCount).toBe(0);
    expect(result.current.pushCount).toBe(0);
    expect(result.current.undoCount).toBe(0);

    let outcome: MoveOutcome = "step";
    act(() => {
        outcome = result.current.move(Direction.Top);
    });

    expect(outcome).toBe("blocked");
    expect(result.current.level.playerDirection).toBe(Direction.Top);
    expect(result.current.level.playerPosition).toEqual({ row: 1, column: 1 });
    expect(result.current.level.shape[1][1]).toBe(Block.player);
    expect(result.current.hasProgress).toBe(false);
    expect(result.current.moveCount).toBe(0);
    expect(result.current.pushCount).toBe(0);
});

test("tracks realtime play status for moves and elapsed time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    const level = createLevel([
        [Block.wall, Block.wall, Block.wall, Block.wall, Block.wall],
        [Block.wall, Block.player, Block.box, Block.empty, Block.wall],
        [Block.wall, Block.objective, Block.wall, Block.wall, Block.wall],
        [Block.wall, Block.wall, Block.wall, Block.wall, Block.wall],
    ]);

    mockedUseLevels.mockReturnValue({
        index: 0,
        level,
        levelPacks: [
            {
                packId: "test-pack",
                title: "Test Pack",
                description: "",
                email: "",
                levels: [level],
            },
        ],
        loadNext: vi.fn(),
        loadPrevious: vi.fn(),
        loadLevel: vi.fn(),
        totalLevels: 1,
    });

    const { result } = renderHook(() => useSokoban());

    expect(result.current.moveCount).toBe(0);
    expect(result.current.pushCount).toBe(0);
    expect(result.current.undoCount).toBe(0);
    expect(result.current.elapsedTimeMs).toBe(0);

    act(() => {
        vi.advanceTimersByTime(1250);
    });

    expect(result.current.elapsedTimeMs).toBeGreaterThanOrEqual(1000);

    let outcome: MoveOutcome = "blocked";
    act(() => {
        outcome = result.current.move(Direction.Right);
    });

    expect(outcome).toBe("crate-push");
    expect(result.current.moveCount).toBe(1);
    expect(result.current.pushCount).toBe(1);

    let didUndo = false;
    act(() => {
        didUndo = result.current.undo();
    });

    expect(didUndo).toBe(true);
    expect(result.current.moveCount).toBe(0);
    expect(result.current.pushCount).toBe(0);
    expect(result.current.undoCount).toBe(1);
});

test("captures completion metrics when level is solved", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    const level = createLevel([
        [Block.wall, Block.wall, Block.wall, Block.wall],
        [Block.wall, Block.player, Block.empty, Block.wall],
        [Block.wall, Block.wall, Block.wall, Block.wall],
    ]);

    mockedUseLevels.mockReturnValue({
        index: 0,
        level,
        levelPacks: [
            {
                packId: "test-pack",
                title: "Test Pack",
                description: "",
                email: "",
                levels: [level],
            },
        ],
        loadNext: vi.fn(),
        loadPrevious: vi.fn(),
        loadLevel: vi.fn(),
        totalLevels: 1,
    });

    const { result } = renderHook(() => useSokoban());

    vi.setSystemTime(4_600);

    let outcome: MoveOutcome = "blocked";
    act(() => {
        outcome = result.current.move(Direction.Right);
    });

    expect(outcome).toBe("step");
    expect(result.current.state).toBe(State.completed);
    expect(result.current.elapsedTimeMs).toBe(3600);
    expect(result.current.completionMetrics).toEqual({
        moves: 1,
        pushes: 0,
        timeMs: 3600,
        undos: 0,
    });
});

test("resets completion metrics after advancing from completed state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000);

    const loadNext = vi.fn();
    const level = createLevel([
        [Block.wall, Block.wall, Block.wall, Block.wall],
        [Block.wall, Block.player, Block.empty, Block.wall],
        [Block.wall, Block.wall, Block.wall, Block.wall],
    ]);

    mockedUseLevels.mockReturnValue({
        index: 0,
        level,
        levelPacks: [
            {
                packId: "test-pack",
                title: "Test Pack",
                description: "",
                email: "",
                levels: [level],
            },
        ],
        loadNext,
        loadPrevious: vi.fn(),
        loadLevel: vi.fn(),
        totalLevels: 1,
    });

    const { result } = renderHook(() => useSokoban());

    vi.setSystemTime(3_500);

    act(() => {
        result.current.move(Direction.Right);
    });

    expect(result.current.state).toBe(State.completed);
    expect(result.current.completionMetrics).toEqual({
        moves: 1,
        pushes: 0,
        timeMs: 1500,
        undos: 0,
    });

    act(() => {
        result.current.next();
    });

    expect(loadNext).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe(State.playing);
    expect(result.current.elapsedTimeMs).toBe(0);
    expect(result.current.pushCount).toBe(0);
    expect(result.current.undoCount).toBe(0);
    expect(result.current.completionMetrics).toBeNull();
});
