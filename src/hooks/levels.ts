import { useState, useMemo, useCallback } from "react";
import Original from "../datas/Original.json";
import Atlas01 from "../datas/Atlas01.json";
import Atlas02 from "../datas/Atlas02.json";
import Atlas03 from "../datas/Atlas03.json";
import Atlas04 from "../datas/Atlas04.json";

export type Level = {
  name: string;
  shape: Block[][];
  width: number;
  height: number;
};

export interface SokobanLevels {
  Title: string;
  Description: string;
  Email: string;
  LevelCollection: LevelCollection;
}

export interface LevelCollection {
  Level: SokobanLevel[];
}

export interface SokobanLevel {
  Id: string;
  Width: string;
  Height: string;
  L: string[];
}

export enum Block {
  void = -1,
  empty = 0,
  objective = 1,
  box = 2,
  boxOnObjective = 3,
  player = 4,
  playerOnObjective = 5,
  wall = 6,
}

const levelBlocks = {
  " ": Block.empty,
  ".": Block.objective,
  $: Block.box,
  "*": Block.boxOnObjective,
  "@": Block.player,
  "+": Block.playerOnObjective,
  "#": Block.wall,
};

type LevelBlock = keyof typeof levelBlocks;

function markExteriorVoid(grid: Block[][]): Block[][] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < height && c < width;
  const queue: Array<[number, number]> = [];
  const seen = Array.from({ length: height }, () => Array<boolean>(width).fill(false));

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const onEdge = r === 0 || c === 0 || r === height - 1 || c === width - 1;
      if (onEdge && grid[r][c] === Block.empty) {
        queue.push([r, c]);
        seen[r][c] = true;
      }
    }
  }

  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length) {
    const [r, c] = queue.shift()!;
    grid[r][c] = Block.void;
    for (const [dr, dc] of deltas) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc) || seen[nr][nc]) continue;
      if (grid[nr][nc] === Block.empty) {
        seen[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  return grid;
}

const SOKOBAN_LEVEL_KEY = "SokobanLevel";

function loadLevels() {
  const AllLevels = [
    Original,
    Atlas01,
    Atlas02,
    Atlas03,
    Atlas04,
  ] as SokobanLevels[];
  return AllLevels.flatMap((levels) =>
    levels.LevelCollection.Level.map((level) => {
      const width = Number(level.Width);
      const height = Number(level.Height);

      const filled = Array.from({ length: height }, (_, r) => {
        const row = level.L[r] ?? "";
        return Array.from({ length: width }, (_, c) => {
          const char = row[c] ?? " ";
          return levelBlocks[char as LevelBlock] ?? Block.empty;
        });
      });

      return {
        name: level.Id,
        shape: markExteriorVoid(filled),
        width,
        height,
      };
    })
  );
}

export function useLevels() {
  const [levels] = useState<Level[]>(loadLevels);
  const [index, setIndex] = useState(() =>
    Number(localStorage.getItem(SOKOBAN_LEVEL_KEY))
  );
  const level = useMemo(() => levels[index], [levels, index]);
  const loadNext = useCallback(() => {
    setIndex(index + 1);
    localStorage.setItem(SOKOBAN_LEVEL_KEY, String(index + 1));
  }, [index]);

  return { index, level, loadNext };
}
