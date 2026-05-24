import { useCallback, useEffect, useState } from "react";

export const SOKOBAN_STATS_STORAGE_KEY = "sokoban.stats.v1";
export const SOKOBAN_STATS_SCHEMA_VERSION = 1 as const;

export type LevelProgress = {
    playCount: number;
    completionCount: number;
    isCompleted: boolean;
    lastPlayedAt: number | null;
    lastCompletedAt: number | null;
    bestMovesInLevel: number | null;
    bestPushesInLevel: number | null;
    bestTimeMsInLevel: number | null;
    bestUndosInLevel: number | null;
};

export type PuzzleRecord = {
    bestMoves: number;
    bestTimeMs: number;
    solveCount: number;
    firstSolvedAt: number;
    lastSolvedAt: number;
};

export type SokobanStats = {
    version: typeof SOKOBAN_STATS_SCHEMA_VERSION;
    updatedAt: number;
    progression: Record<string, LevelProgress>;
    records: Record<string, PuzzleRecord>;
};

export type SaveLevelResultInput = {
    levelId: string;
    puzzleId: string;
    moves: number;
    pushes?: number;
    timeMs: number;
    undos?: number;
    completedAt?: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNonNegativeInteger(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.floor(value));
}

function toBestMetric(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }

    return Math.max(0, Math.floor(value));
}

function toTimestamp(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }

    const timestamp = Math.floor(value);
    return timestamp > 0 ? timestamp : null;
}

function createEmptyLevelProgress(): LevelProgress {
    return {
        playCount: 0,
        completionCount: 0,
        isCompleted: false,
        lastPlayedAt: null,
        lastCompletedAt: null,
        bestMovesInLevel: null,
        bestPushesInLevel: null,
        bestTimeMsInLevel: null,
        bestUndosInLevel: null,
    };
}

function createEmptyStats(updatedAt = Date.now()): SokobanStats {
    return {
        version: SOKOBAN_STATS_SCHEMA_VERSION,
        updatedAt,
        progression: {},
        records: {},
    };
}

function sanitizeLevelProgress(value: unknown): LevelProgress {
    if (!isObject(value)) {
        return createEmptyLevelProgress();
    }

    const completionCount = toNonNegativeInteger(value.completionCount);
    const isCompleted =
        typeof value.isCompleted === "boolean" ? value.isCompleted : completionCount > 0;

    return {
        playCount: toNonNegativeInteger(value.playCount),
        completionCount,
        isCompleted,
        lastPlayedAt: toTimestamp(value.lastPlayedAt),
        lastCompletedAt: toTimestamp(value.lastCompletedAt),
        bestMovesInLevel: toBestMetric(value.bestMovesInLevel),
        bestPushesInLevel: toBestMetric(value.bestPushesInLevel),
        bestTimeMsInLevel: toBestMetric(value.bestTimeMsInLevel),
        bestUndosInLevel: toBestMetric(value.bestUndosInLevel),
    };
}

function sanitizePuzzleRecord(value: unknown): PuzzleRecord | null {
    if (!isObject(value)) {
        return null;
    }

    const bestMoves = toBestMetric(value.bestMoves);
    const bestTimeMs = toBestMetric(value.bestTimeMs);
    const firstSolvedAt = toTimestamp(value.firstSolvedAt);
    const lastSolvedAt = toTimestamp(value.lastSolvedAt);
    const solveCount = Math.max(1, toNonNegativeInteger(value.solveCount));

    if (bestMoves === null || bestTimeMs === null || firstSolvedAt === null || lastSolvedAt === null) {
        return null;
    }

    return {
        bestMoves,
        bestTimeMs,
        solveCount,
        firstSolvedAt,
        lastSolvedAt: Math.max(lastSolvedAt, firstSolvedAt),
    };
}

function readStoredStats(): SokobanStats {
    if (typeof window === "undefined") {
        return createEmptyStats();
    }

    try {
        const raw = window.localStorage.getItem(SOKOBAN_STATS_STORAGE_KEY);
        if (!raw) {
            return createEmptyStats();
        }

        const parsed = JSON.parse(raw) as unknown;
        if (!isObject(parsed)) {
            return createEmptyStats();
        }

        const progression: Record<string, LevelProgress> = {};
        if (isObject(parsed.progression)) {
            for (const [levelId, value] of Object.entries(parsed.progression)) {
                progression[levelId] = sanitizeLevelProgress(value);
            }
        }

        const records: Record<string, PuzzleRecord> = {};
        if (isObject(parsed.records)) {
            for (const [puzzleId, value] of Object.entries(parsed.records)) {
                const sanitized = sanitizePuzzleRecord(value);
                if (sanitized) {
                    records[puzzleId] = sanitized;
                }
            }
        }

        const updatedAt = toTimestamp(parsed.updatedAt) ?? Date.now();

        return {
            version: SOKOBAN_STATS_SCHEMA_VERSION,
            updatedAt,
            progression,
            records,
        };
    } catch {
        return createEmptyStats();
    }
}

function writeStoredStats(stats: SokobanStats) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(SOKOBAN_STATS_STORAGE_KEY, JSON.stringify(stats));
}

function nextBest(current: number | null, candidate: number): number {
    if (current === null) {
        return candidate;
    }

    return Math.min(current, candidate);
}

export function useStats() {
    const [stats, setStats] = useState<SokobanStats>(readStoredStats);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const onStorage = (event: StorageEvent) => {
            if (event.key !== SOKOBAN_STATS_STORAGE_KEY) {
                return;
            }

            setStats(readStoredStats());
        };

        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const saveLevelResult = useCallback((input: SaveLevelResultInput) => {
        if (!input.levelId || !input.puzzleId) {
            return;
        }

        const completedAt = toTimestamp(input.completedAt) ?? Date.now();
        const moves = toNonNegativeInteger(input.moves);
        const pushes = input.pushes === undefined ? null : toNonNegativeInteger(input.pushes);
        const timeMs = toNonNegativeInteger(input.timeMs);
        const undos = input.undos === undefined ? null : toNonNegativeInteger(input.undos);

        setStats((current) => {
            const currentProgress = current.progression[input.levelId] ?? createEmptyLevelProgress();
            const nextProgress: LevelProgress = {
                playCount: currentProgress.playCount + 1,
                completionCount: currentProgress.completionCount + 1,
                isCompleted: true,
                lastPlayedAt: completedAt,
                lastCompletedAt: completedAt,
                bestMovesInLevel: nextBest(currentProgress.bestMovesInLevel, moves),
                bestPushesInLevel:
                    pushes === null
                        ? currentProgress.bestPushesInLevel
                        : nextBest(currentProgress.bestPushesInLevel, pushes),
                bestTimeMsInLevel: nextBest(currentProgress.bestTimeMsInLevel, timeMs),
                bestUndosInLevel:
                    undos === null
                        ? currentProgress.bestUndosInLevel
                        : nextBest(currentProgress.bestUndosInLevel, undos),
            };

            const currentRecord = current.records[input.puzzleId];
            const nextRecord: PuzzleRecord = currentRecord
                ? {
                    bestMoves: Math.min(currentRecord.bestMoves, moves),
                    bestTimeMs: Math.min(currentRecord.bestTimeMs, timeMs),
                    solveCount: currentRecord.solveCount + 1,
                    firstSolvedAt: currentRecord.firstSolvedAt,
                    lastSolvedAt: completedAt,
                }
                : {
                    bestMoves: moves,
                    bestTimeMs: timeMs,
                    solveCount: 1,
                    firstSolvedAt: completedAt,
                    lastSolvedAt: completedAt,
                };

            const nextStats: SokobanStats = {
                version: SOKOBAN_STATS_SCHEMA_VERSION,
                updatedAt: completedAt,
                progression: {
                    ...current.progression,
                    [input.levelId]: nextProgress,
                },
                records: {
                    ...current.records,
                    [input.puzzleId]: nextRecord,
                },
            };

            writeStoredStats(nextStats);
            return nextStats;
        });
    }, []);

    const clearStats = useCallback(() => {
        setStats((current) => {
            const next = createEmptyStats(current.updatedAt);
            if (typeof window !== "undefined") {
                window.localStorage.removeItem(SOKOBAN_STATS_STORAGE_KEY);
            }
            return next;
        });
    }, []);

    return {
        stats,
        saveLevelResult,
        clearStats,
    };
}

export type { SaveLevelResultInput as SaveLevelResultParams };