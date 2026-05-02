import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { useSokoban, Direction, type MoveOutcome } from "./sokoban";
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

test("blocked movement updates player orientation without moving or adding progress", () => {
    const level = createLevel([
        [Block.wall, Block.wall, Block.wall],
        [Block.wall, Block.player, Block.wall],
        [Block.wall, Block.empty, Block.wall],
    ]);

    mockedUseLevels.mockReturnValue({
        index: 0,
        level,
        loadNext: vi.fn(),
        loadPrevious: vi.fn(),
        totalLevels: 1,
    });

    const { result } = renderHook(() => useSokoban());

    expect(result.current.level.playerDirection).toBe(Direction.Right);
    expect(result.current.level.playerPosition).toEqual({ row: 1, column: 1 });
    expect(result.current.hasProgress).toBe(false);

    let outcome: MoveOutcome = "step";
    act(() => {
        outcome = result.current.move(Direction.Top);
    });

    expect(outcome).toBe("blocked");
    expect(result.current.level.playerDirection).toBe(Direction.Top);
    expect(result.current.level.playerPosition).toEqual({ row: 1, column: 1 });
    expect(result.current.level.shape[1][1]).toBe(Block.player);
    expect(result.current.hasProgress).toBe(false);
});
