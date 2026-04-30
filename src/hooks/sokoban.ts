import { useEffect, useState, useCallback } from "react";
import { Level, Block, useLevels } from "./levels";
import { cloneDeep } from "lodash";

export enum Direction {
  Left,
  Top,
  Right,
  Bottom,
}

export enum State {
  playing,
  completed,
}

export type MoveOutcome = "blocked" | "step" | "crate-push" | "crate-docked";

type Position = {
  row: number;
  column: number;
};

const dirPositions = new Map<Direction, Position>();
dirPositions.set(Direction.Left, { row: 0, column: -1 });
dirPositions.set(Direction.Top, { row: -1, column: 0 });
dirPositions.set(Direction.Right, { row: 0, column: 1 });
dirPositions.set(Direction.Bottom, { row: 1, column: 0 });

function directionToPosition(direction: Direction) {
  return dirPositions.get(direction)!;
}

type Board = Array<
  Level & {
    playerPosition: Position;
    playerDirection: Direction;
  }
>;

function getPlayerPosition<T extends Level>(level: T): Position {
  const row = level.shape.findIndex((blocks) =>
    blocks.some((block) =>
      [Block.player, Block.playerOnObjective].includes(block)
    )
  );
  if (row >= 0) {
    const column = level.shape[row].findIndex((block) =>
      [Block.player, Block.playerOnObjective].includes(block)
    );
    return { row, column };
  }
  throw new Error(`Invalid level, Player position not found : 
  ${level.shape}`);
}

export function useSokoban() {
  const { index, level, loadNext, loadPrevious, totalLevels } = useLevels();
  const [state, setState] = useState<State>(State.playing);
  const [hasProgress, setHasProgress] = useState(false);
  const initboard = useCallback(
    () => [
      {
        ...level,
        playerPosition: getPlayerPosition(level),
        playerDirection: Direction.Right,
      },
    ],
    [level]
  );
  const [board, setBoard] = useState<Board>(initboard);
  const move = useCallback(
    (direction: Direction): MoveOutcome => {
      if (state !== State.playing) {
        return "blocked";
      }

      const dir = directionToPosition(direction);
      const last = board[board.length - 1];
      const next = cloneDeep(last);
      next.playerPosition = {
        row: last.playerPosition.row + dir.row,
        column: last.playerPosition.column + dir.column,
      };
      next.playerDirection = direction;

      // are we moving a block
      let movingBlock = false;
      let crateDocked = false;
      if (
        [Block.box, Block.boxOnObjective].includes(
          last.shape[next.playerPosition.row][next.playerPosition.column]
        ) &&
        [Block.empty, Block.objective].includes(
          last.shape[next.playerPosition.row + dir.row][
          next.playerPosition.column + dir.column
          ]
        )
      ) {
        crateDocked =
          last.shape[next.playerPosition.row + dir.row][
          next.playerPosition.column + dir.column
          ] === Block.objective;
        next.shape[next.playerPosition.row][next.playerPosition.column] -=
          Block.box;
        next.shape[next.playerPosition.row + dir.row][
          next.playerPosition.column + dir.column
        ] += Block.box;
        movingBlock = true;
      }

      //are we moving into an empty space
      if (
        [Block.empty, Block.objective].includes(
          next.shape[next.playerPosition.row][next.playerPosition.column]
        )
      ) {
        next.shape[last.playerPosition.row][last.playerPosition.column] -=
          Block.player;
        next.shape[next.playerPosition.row][next.playerPosition.column] +=
          Block.player;
        if (
          !next.shape.some((row) =>
            row.some((block) =>
              [Block.objective, Block.playerOnObjective].includes(block)
            )
          )
        )
          setState(State.completed);
        if (!movingBlock) board.pop();

        setHasProgress(true);
        setBoard([...board, next]);

        if (movingBlock) {
          return crateDocked ? "crate-docked" : "crate-push";
        }

        return "step";
      }

      if (last.playerDirection !== direction) {
        setBoard([...board.slice(0, -1), { ...last, playerDirection: direction }]);
      }

      return "blocked";
    },
    [board, state]
  );

  const next = useCallback(() => {
    if (state === State.completed) {
      loadNext();
      setState(State.playing);
      setHasProgress(false);
    }
  }, [state, loadNext]);

  const nextLevel = useCallback(() => {
    loadNext();
    setState(State.playing);
    setHasProgress(false);
  }, [loadNext]);

  const previousLevel = useCallback(() => {
    loadPrevious();
    setState(State.playing);
    setHasProgress(false);
  }, [loadPrevious]);

  const undo = useCallback(() => {
    if (state === State.playing && board.length > 1) {
      setBoard(board.slice(0, -1));
      return true;
    }

    return false;
  }, [state, board]);
  const restart = useCallback(() => {
    if (state === State.playing) {
      setBoard(initboard());
      setHasProgress(false);
    }
  }, [state, initboard]);

  useEffect(() => {
    if (board[0].name !== level.name) {
      setBoard(initboard());
      setHasProgress(false);
    }
  }, [board, state, level, loadNext, next, restart, initboard, move]);

  return {
    index,
    level: board[board.length - 1],
    totalLevels,
    state,
    move,
    next,
    nextLevel,
    previousLevel,
    undo,
    restart,
    hasProgress,
  };
}
