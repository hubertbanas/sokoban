import { useState, useMemo, useCallback } from "react";
import { configuredLevelPackOrder } from "../datas/pack-order";

export type Level = {
  name: string;
  shape: Block[][];
  width: number;
  height: number;
  packId: string;
  levelId: string;
  puzzleId: string;
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

const levelPackModules = import.meta.glob("../datas/*.json", {
  eager: true,
  import: "default",
}) as Record<string, SokobanLevels>;

const levelPackPathComparer = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

const prioritizedPackOrder = new Map<string, number>(
  configuredLevelPackOrder.map((packId, index) => [packId.toLowerCase(), index])
);

type LoadedLevelPack = {
  packId: string;
  levels: SokobanLevels;
};

function levelPackIdFromPath(path: string): string {
  const fileName = path.split("/").pop() ?? path;
  return fileName.replace(/\.json$/i, "");
}

function levelIdFromParts(packId: string, levelIndex: number): string {
  return `${packId}:${levelIndex}`;
}

function compareLevelPackPaths(leftPath: string, rightPath: string): number {
  const leftPackId = levelPackIdFromPath(leftPath);
  const rightPackId = levelPackIdFromPath(rightPath);
  const leftPriority = prioritizedPackOrder.get(leftPackId.toLowerCase());
  const rightPriority = prioritizedPackOrder.get(rightPackId.toLowerCase());

  if (leftPriority !== undefined || rightPriority !== undefined) {
    if (leftPriority === undefined) return 1;
    if (rightPriority === undefined) return -1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  }

  return levelPackPathComparer.compare(leftPath, rightPath);
}

function generatePuzzleFingerprint(layout: string[]): string {
  const joined = layout.join("|");
  let hash = 2166136261;
  for (let i = 0; i < joined.length; i++) {
    hash ^= joined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function loadLevelPacks(): LoadedLevelPack[] {
  return Object.entries(levelPackModules)
    .sort(([leftPath], [rightPath]) => compareLevelPackPaths(leftPath, rightPath))
    .map(([path, levels]) => ({
      packId: levelPackIdFromPath(path),
      levels,
    }));
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

function normalizeIndex(index: number, length: number) {
  if (length === 0) return 0;
  return ((index % length) + length) % length;
}

function loadLevels() {
  const allLevelPacks = loadLevelPacks();
  return allLevelPacks.flatMap(({ packId, levels }) =>
    levels.LevelCollection.Level.map((level, levelIndex) => {
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
        packId,
        levelId: levelIdFromParts(packId, levelIndex),
        puzzleId: generatePuzzleFingerprint(level.L),
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
  const [index, setIndex] = useState(() => {
    const stored = Number(localStorage.getItem(SOKOBAN_LEVEL_KEY));
    const initial = Number.isFinite(stored) ? stored : 0;
    return normalizeIndex(initial, levels.length);
  });
  const level = useMemo(() => levels[index], [levels, index]);

  const updateIndex = useCallback(
    (delta: number) => {
      setIndex((current) => {
        const nextIndex = normalizeIndex(current + delta, levels.length);
        localStorage.setItem(SOKOBAN_LEVEL_KEY, String(nextIndex));
        return nextIndex;
      });
    },
    [levels.length]
  );

  const loadNext = useCallback(() => {
    updateIndex(1);
  }, [updateIndex]);

  const loadPrevious = useCallback(() => {
    updateIndex(-1);
  }, [updateIndex]);

  return {
    index,
    level,
    loadNext,
    loadPrevious,
    totalLevels: levels.length,
  };
}
