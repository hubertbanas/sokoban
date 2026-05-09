import "@testing-library/jest-dom/vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, cleanup, act, within } from "@testing-library/react";
import { vi, expect, test, beforeAll, beforeEach, afterEach } from "vitest";
import Game from "./Game";
import { Block } from "./hooks/levels";
import { Direction, State, useSokoban, type MoveOutcome } from "./hooks/sokoban";
import { useKeyBoard } from "./hooks/keyboard";
import { useGameSounds } from "./hooks/useGameSounds";
import { useStats } from "./hooks/useStats";
import style from "./components/sokoban.module.css";

vi.mock("./hooks/keyboard", () => ({
  useKeyBoard: vi.fn(),
}));

vi.mock("./components/help", () => ({
  Help: ({ open = false, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void }) => (
    <div data-testid="help" data-open={open ? "true" : "false"}>
      <button type="button" data-testid="help-open" onClick={() => onOpenChange?.(true)}>
        Open Help
      </button>
      <button type="button" data-testid="help-close" onClick={() => onOpenChange?.(false)}>
        Close Help
      </button>
    </div>
  ),
}));

vi.mock("./components/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));

vi.mock("./components/mobile-controls", () => ({
  MobileControls: ({ onUndo }: { onUndo: () => void }) => (
    <div data-testid="mobile-controls">
      <button type="button" data-testid="mobile-undo" onClick={onUndo}>
        Mobile Undo
      </button>
    </div>
  ),
}));

vi.mock("./components/sfx-settings", () => ({
  SfxSettings: ({ open = false, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void }) => (
    <div data-testid="sfx-settings" data-open={open ? "true" : "false"}>
      <button type="button" data-testid="sfx-open" onClick={() => onOpenChange?.(true)}>
        Open SFX
      </button>
      <button type="button" data-testid="sfx-close" onClick={() => onOpenChange?.(false)}>
        Close SFX
      </button>
    </div>
  ),
}));

vi.mock("./hooks/useGameSounds", () => ({
  useGameSounds: vi.fn(),
}));

vi.mock("./hooks/useStats", () => ({
  useStats: vi.fn(),
}));

vi.mock("./hooks/sokoban", () => {
  const Direction = {
    Left: 0,
    Top: 1,
    Right: 2,
    Bottom: 3,
  };
  const State = {
    playing: 0,
    completed: 1,
  };

  return {
    Direction,
    State,
    useSokoban: vi.fn(),
  };
});

const mockedUseSokoban = vi.mocked(useSokoban);
const mockedUseKeyBoard = vi.mocked(useKeyBoard);
const mockedUseGameSounds = vi.mocked(useGameSounds);
const mockedUseStats = vi.mocked(useStats);
const cssText = readFileSync(resolve(process.cwd(), "src/components/sokoban.module.css"), "utf-8");

function hasUserSelectNone(className: string) {
  const ruleRegex = new RegExp(`\\.${className}[\\s\\S]*?{[\\s\\S]*?}`, "g");
  const matches = cssText.match(ruleRegex) ?? [];
  return matches.some((rule: string) => /user-select\s*:\s*none/.test(rule));
}

function getLatestKeyboardHandler() {
  const latestCall = mockedUseKeyBoard.mock.calls.at(-1);
  if (!latestCall) {
    throw new Error("Expected useKeyBoard to be called before reading handler");
  }

  return latestCall[0] as Parameters<typeof useKeyBoard>[0];
}

function createKeyboardEvent(code: string) {
  const event = new KeyboardEvent("keydown", { code });
  const preventDefaultSpy = vi.spyOn(event, "preventDefault");
  return { event, preventDefaultSpy };
}

function buildLevel() {
  return {
    packId: "test-pack",
    levelId: "test-pack:0",
    puzzleId: "test-puzzle-id",
    name: "Regression Test",
    width: 3,
    height: 3,
    playerDirection: Direction.Right,
    playerPosition: { row: 1, column: 1 },
    shape: [
      [Block.wall, Block.wall, Block.wall],
      [Block.wall, Block.player, Block.wall],
      [Block.wall, Block.wall, Block.wall],
    ],
  };
}

function buildLevelPacks() {
  const firstLevel = {
    ...buildLevel(),
    levelId: "test-pack:0",
    name: "Regression Test",
  };
  const secondLevel = {
    ...buildLevel(),
    levelId: "test-pack:1",
    name: "Target Level",
  };

  return [
    {
      packId: "test-pack",
      title: "Test Pack",
      description: "Pack description",
      email: "",
      levels: [firstLevel, secondLevel],
    },
  ];
}

function mockSokoban(overrides: Partial<ReturnType<typeof useSokoban>> = {}) {
  const defaults = {
    index: 0,
    totalLevels: 500,
    level: buildLevel(),
    levelPacks: buildLevelPacks(),
    completionMetrics: null,
    state: State.playing,
    hasProgress: false,
    move: vi.fn(),
    next: vi.fn(),
    nextLevel: vi.fn(),
    previousLevel: vi.fn(),
    loadLevel: vi.fn(),
    undo: vi.fn(),
    restart: vi.fn(),
  };

  const value = { ...defaults, ...overrides };
  mockedUseSokoban.mockReturnValue(value);
  return value;
}

function createMockStats(overrides: Partial<ReturnType<typeof useStats>> = {}): ReturnType<typeof useStats> {
  return {
    stats: {
      version: 1,
      updatedAt: 0,
      progression: {},
      records: {},
    },
    saveLevelResult: vi.fn(),
    clearStats: vi.fn(),
    ...overrides,
  };
}

function createMockGameSounds(overrides: Partial<ReturnType<typeof useGameSounds>> = {}) {
  return {
    play: vi.fn(),
    playCratePush: vi.fn(),
    playCrateDocked: vi.fn(),
    playCrateUndo: vi.fn(),
    playPlayerStep: vi.fn(),
    playPlayerBump: vi.fn(),
    playLevelComplete: vi.fn(),
    muted: false,
    volume: 1,
    setMuted: vi.fn(),
    toggleMuted: vi.fn(),
    setVolume: vi.fn(),
    ...overrides,
  };
}

function setLevelBestVisibility(enabled: boolean) {
  fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
  const menuDialog = screen.getByRole("dialog", { name: /game menu/i });
  const toggle = screen.getByRole("checkbox", { name: /level best stats/i });

  if (!(toggle instanceof HTMLInputElement)) {
    throw new Error("Expected level best toggle to be an input element");
  }

  if (toggle.checked !== enabled) {
    fireEvent.click(toggle);
  }

  fireEvent.click(within(menuDialog).getByRole("button", { name: /close menu/i }));
}

beforeAll(() => {
  class ResizeObserverMock {
    observe() { }
    disconnect() { }
    unobserve() { }
  }

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
  });
});

beforeEach(() => {
  mockedUseSokoban.mockReset();
  mockedUseKeyBoard.mockReset();
  mockedUseGameSounds.mockReset();
  mockedUseStats.mockReset();
  mockedUseGameSounds.mockReturnValue(createMockGameSounds());
  mockedUseStats.mockReturnValue(createMockStats());
});

afterEach(() => {
  cleanup();
});

test("next level confirmation opens on click, not pointerdown, when progress exists", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, nextLevel });

  render(<Game />);
  const nextButton = screen.getByRole("button", { name: "Next Level" });

  fireEvent.pointerDown(nextButton, { button: 0, pointerId: 1 });
  expect(screen.queryByRole("dialog", { name: /switch to next level confirmation/i })).not.toBeInTheDocument();
  expect(nextLevel).not.toHaveBeenCalled();

  fireEvent.click(nextButton);
  expect(screen.getByRole("dialog", { name: /switch to next level confirmation/i })).toBeInTheDocument();
  expect(nextLevel).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Go to Next Level" }));
  expect(nextLevel).toHaveBeenCalledTimes(1);
});

test("next level confirmation opens on touch pointerdown when progress exists", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, nextLevel });

  render(<Game />);
  const nextButton = screen.getByRole("button", { name: "Next Level" });

  fireEvent.pointerDown(nextButton, { button: 0, pointerId: 1, pointerType: "touch" });
  expect(screen.getByRole("dialog", { name: /switch to next level confirmation/i })).toBeInTheDocument();
  expect(nextLevel).not.toHaveBeenCalled();
});

test("touch pointerdown does not immediately close confirmation on overlay click", () => {
  mockSokoban({ hasProgress: true, state: State.playing });

  render(<Game />);
  const nextButton = screen.getByRole("button", { name: "Next Level" });

  fireEvent.pointerDown(nextButton, { button: 0, pointerId: 1, pointerType: "touch" });
  const dialog = screen.getByRole("dialog", { name: /switch to next level confirmation/i });

  fireEvent.click(dialog);
  expect(dialog).toBeInTheDocument();

  fireEvent.click(dialog);
  expect(dialog).not.toBeInTheDocument();
});

test("touch pointerdown does not immediately close previous confirmation on overlay click", () => {
  mockSokoban({ hasProgress: true, state: State.playing });

  render(<Game />);
  const previousButton = screen.getByRole("button", { name: "Previous Level" });

  fireEvent.pointerDown(previousButton, { button: 0, pointerId: 1, pointerType: "touch" });
  const dialog = screen.getByRole("dialog", { name: /switch to previous level confirmation/i });

  fireEvent.click(dialog);
  expect(dialog).toBeInTheDocument();

  fireEvent.click(dialog);
  expect(dialog).not.toBeInTheDocument();
});

test("next level triggers immediately on pointerdown when no progress exists", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: false, state: State.playing, nextLevel });

  render(<Game />);
  const nextButton = screen.getByRole("button", { name: "Next Level" });

  fireEvent.pointerDown(nextButton, { button: 0, pointerId: 1 });

  expect(nextLevel).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog", { name: /switch to next level confirmation/i })).not.toBeInTheDocument();
});

test("previous level confirmation opens on click, not pointerdown, when progress exists", () => {
  const previousLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, previousLevel });

  render(<Game />);
  const previousButton = screen.getByRole("button", { name: "Previous Level" });

  fireEvent.pointerDown(previousButton, { button: 0, pointerId: 1 });
  expect(screen.queryByRole("dialog", { name: /switch to previous level confirmation/i })).not.toBeInTheDocument();
  expect(previousLevel).not.toHaveBeenCalled();

  fireEvent.click(previousButton);
  expect(screen.getByRole("dialog", { name: /switch to previous level confirmation/i })).toBeInTheDocument();
  expect(previousLevel).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Go to Previous Level" }));
  expect(previousLevel).toHaveBeenCalledTimes(1);
});

test("previous level confirmation opens on touch pointerdown when progress exists", () => {
  const previousLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, previousLevel });

  render(<Game />);
  const previousButton = screen.getByRole("button", { name: "Previous Level" });

  fireEvent.pointerDown(previousButton, { button: 0, pointerId: 1, pointerType: "touch" });
  expect(screen.getByRole("dialog", { name: /switch to previous level confirmation/i })).toBeInTheDocument();
  expect(previousLevel).not.toHaveBeenCalled();
});

test("previous level triggers immediately on pointerdown when no progress exists", () => {
  const previousLevel = vi.fn();
  mockSokoban({ hasProgress: false, state: State.playing, previousLevel });

  render(<Game />);
  const previousButton = screen.getByRole("button", { name: "Previous Level" });

  fireEvent.pointerDown(previousButton, { button: 0, pointerId: 1 });

  expect(previousLevel).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog", { name: /switch to previous level confirmation/i })).not.toBeInTheDocument();
});

test("long press does not enable text selection on nav, modal, or completion buttons", () => {
  mockSokoban({ hasProgress: true, state: State.playing });

  const { unmount } = render(<Game />);
  const nextButton = screen.getByRole("button", { name: "Next Level" });
  const previousButton = screen.getByRole("button", { name: "Previous Level" });

  fireEvent.pointerDown(nextButton, { button: 0, pointerId: 1, pointerType: "mouse" });
  expect(nextButton).toHaveClass(style.levelNavButton);
  expect(hasUserSelectNone("levelNavButton")).toBe(true);

  fireEvent.pointerDown(previousButton, { button: 0, pointerId: 2, pointerType: "mouse" });
  expect(previousButton).toHaveClass(style.levelNavButton);

  fireEvent.click(nextButton);
  fireEvent.click(nextButton);
  const closeButton = screen.getByRole("button", { name: "Close" });
  const confirmButton = screen.getByRole("button", { name: "Go to Next Level" });
  const cancelButton = screen.getByRole("button", { name: "Cancel" });

  fireEvent.pointerDown(closeButton, { button: 0, pointerId: 3 });
  expect(closeButton).toHaveClass(style.modalCloseButton);
  expect(hasUserSelectNone("modalCloseButton")).toBe(true);

  fireEvent.pointerDown(confirmButton, { button: 0, pointerId: 4 });
  expect(confirmButton).toHaveClass(style.levelNavButton);

  fireEvent.pointerDown(cancelButton, { button: 0, pointerId: 5 });
  expect(cancelButton).toHaveClass(style.levelNavButton);

  unmount();
  mockSokoban({ hasProgress: false, state: State.completed, next: vi.fn() });

  render(<Game />);
  const completionButton = screen.getByRole("button", { name: "Continue" });

  fireEvent.pointerDown(completionButton, { button: 0, pointerId: 6 });
  expect(completionButton).toHaveClass(style.completionButton);
  expect(hasUserSelectNone("completionButton")).toBe(true);
});

test("keyboard bracket-right opens confirmation when progress exists", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, nextLevel });

  render(<Game />);
  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("BracketRight");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(screen.getByRole("dialog", { name: /switch to next level confirmation/i })).toBeInTheDocument();
  expect(nextLevel).not.toHaveBeenCalled();
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
});

test("keyboard bracket-left opens confirmation when progress exists", () => {
  const previousLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, previousLevel });

  render(<Game />);
  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("BracketLeft");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(screen.getByRole("dialog", { name: /switch to previous level confirmation/i })).toBeInTheDocument();
  expect(previousLevel).not.toHaveBeenCalled();
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
});

test("cancel closes confirmation dialog without navigation", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, nextLevel });

  render(<Game />);
  fireEvent.click(screen.getByRole("button", { name: "Next Level" }));
  expect(screen.getByRole("dialog", { name: /switch to next level confirmation/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("dialog", { name: /switch to next level confirmation/i })).not.toBeInTheDocument();
  expect(nextLevel).not.toHaveBeenCalled();
});

test("escape closes confirmation dialog", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, nextLevel });

  render(<Game />);
  fireEvent.click(screen.getByRole("button", { name: "Next Level" }));
  expect(screen.getByRole("dialog", { name: /switch to next level confirmation/i })).toBeInTheDocument();

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("Escape");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(screen.queryByRole("dialog", { name: /switch to next level confirmation/i })).not.toBeInTheDocument();
  expect(nextLevel).not.toHaveBeenCalled();
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
});

test("enter confirms when confirm button is focused", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, nextLevel });

  render(<Game />);
  fireEvent.click(screen.getByRole("button", { name: "Next Level" }));

  const confirmButton = screen.getByRole("button", { name: "Go to Next Level" });
  confirmButton.focus();

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("Enter");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(nextLevel).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog", { name: /switch to next level confirmation/i })).not.toBeInTheDocument();
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
});

test("enter cancels when confirm button is not focused", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, nextLevel });

  render(<Game />);
  fireEvent.click(screen.getByRole("button", { name: "Next Level" }));

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("Enter");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(nextLevel).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog", { name: /switch to next level confirmation/i })).not.toBeInTheDocument();
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
});

test("arrow keys move focus between confirmation buttons", () => {
  mockSokoban({ hasProgress: true, state: State.playing });

  render(<Game />);
  fireEvent.click(screen.getByRole("button", { name: "Next Level" }));

  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  const confirmButton = screen.getByRole("button", { name: "Go to Next Level" });

  cancelButton.focus();
  expect(cancelButton).toHaveFocus();

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event: rightEvent, preventDefaultSpy: rightPreventDefault } = createKeyboardEvent("ArrowRight");

  act(() => {
    onKeyboardEvent(rightEvent);
  });

  expect(confirmButton).toHaveFocus();
  expect(rightPreventDefault).toHaveBeenCalledTimes(1);

  const { event: leftEvent, preventDefaultSpy: leftPreventDefault } = createKeyboardEvent("ArrowLeft");

  act(() => {
    onKeyboardEvent(leftEvent);
  });

  expect(cancelButton).toHaveFocus();
  expect(leftPreventDefault).toHaveBeenCalledTimes(1);
});

test("displays completion popup when level is completed", () => {
  mockSokoban({ state: State.completed });

  render(<Game />);

  expect(screen.getByRole("dialog", { name: /level completed/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /congratulations!/i })).toBeInTheDocument();
  expect(screen.getByText(/you completed this level\./i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  expect(screen.getByTestId("mobile-controls")).toBeInTheDocument();
});

test("hides level best UI when toggle is off by default", () => {
  mockSokoban({ state: State.playing });

  render(<Game />);

  expect(screen.queryByText("Level Best: No record yet")).not.toBeInTheDocument();
});

test("renders no-record placeholders when level best toggle is enabled", () => {
  mockSokoban({ state: State.playing });

  render(<Game />);
  setLevelBestVisibility(true);

  expect(screen.getByText("Level Best: No record yet")).toBeInTheDocument();
});

test("renders level best from useStats", () => {
  const level = buildLevel();

  mockedUseStats.mockReturnValue(
    createMockStats({
      stats: {
        version: 1,
        updatedAt: 1700,
        progression: {
          [level.levelId]: {
            playCount: 3,
            completionCount: 2,
            isCompleted: true,
            lastPlayedAt: 1500,
            lastCompletedAt: 1600,
            bestMovesInLevel: 9,
            bestTimeMsInLevel: 13_000,
          },
        },
        records: {
          [level.puzzleId]: {
            bestMoves: 8,
            bestTimeMs: 11_000,
            solveCount: 5,
            firstSolvedAt: 1200,
            lastSolvedAt: 1700,
          },
        },
      },
    })
  );
  mockSokoban({ state: State.playing, level });

  render(<Game />);
  setLevelBestVisibility(true);

  expect(screen.getByText("Level Best: 9 moves in 0:13")).toBeInTheDocument();
  expect(screen.queryByText(/^Puzzle Best:/)).not.toBeInTheDocument();
});

test("shows level best inside completion dialog", () => {
  const level = buildLevel();

  mockedUseStats.mockReturnValue(
    createMockStats({
      stats: {
        version: 1,
        updatedAt: 1700,
        progression: {
          [level.levelId]: {
            playCount: 1,
            completionCount: 1,
            isCompleted: true,
            lastPlayedAt: 1600,
            lastCompletedAt: 1700,
            bestMovesInLevel: 1,
            bestTimeMsInLevel: 2_000,
          },
        },
        records: {
          [level.puzzleId]: {
            bestMoves: 1,
            bestTimeMs: 2_000,
            solveCount: 1,
            firstSolvedAt: 1700,
            lastSolvedAt: 1700,
          },
        },
      },
    })
  );
  mockSokoban({ state: State.playing, level });

  const { rerender } = render(<Game />);
  setLevelBestVisibility(true);

  mockSokoban({ state: State.completed, level });
  rerender(<Game />);

  const completionDialog = screen.getByRole("dialog", { name: /level completed/i });
  expect(within(completionDialog).getByText("Level Best: 1 move in 0:02")).toBeInTheDocument();
  expect(within(completionDialog).queryByText(/^Puzzle Best:/)).not.toBeInTheDocument();
});

test("displays pack-complete message on the last level of the current pack", () => {
  const levelPacks = buildLevelPacks();
  mockSokoban({
    state: State.completed,
    level: levelPacks[0].levels[1],
    levelPacks,
  });

  render(<Game />);

  expect(screen.getByRole("heading", { name: /level pack complete!/i })).toBeInTheDocument();
  expect(screen.getByText(/you completed the last level in this pack\./i)).toBeInTheDocument();
  expect(screen.getByText(/switch to a different level pack/i)).toBeInTheDocument();
});

test("clicking continue on completion popup advances to the next level", () => {
  const next = vi.fn();
  mockSokoban({ state: State.completed, next });

  render(<Game />);

  fireEvent.click(screen.getByRole("button", { name: /continue/i }));

  expect(next).toHaveBeenCalledTimes(1);
});

test("pressing Enter on completion popup advances to next level", () => {
  const next = vi.fn();
  mockSokoban({ state: State.completed, next });

  render(<Game />);

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("Enter");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(next).toHaveBeenCalledTimes(1);
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
});

test("completion popup appears dynamically when state changes to completed", () => {
  mockSokoban({ state: State.playing });
  const { rerender } = render(<Game />);

  expect(screen.queryByRole("dialog", { name: /level completed/i })).not.toBeInTheDocument();

  mockSokoban({ state: State.completed });
  rerender(<Game />);

  expect(screen.getByRole("dialog", { name: /level completed/i })).toBeInTheDocument();
});

test("renders pack-aware level number", () => {
  mockSokoban({
    index: 4,
    level: {
      ...buildLevel(),
      name: "The Box Puzzle",
    },
  });

  render(<Game />);

  const levelSelectorButton = screen.getByRole("button", { name: /open level selector/i });
  expect(within(levelSelectorButton).getByText("Test Pack")).toBeInTheDocument();
  expect(within(levelSelectorButton).getByText("1 / 2")).toBeInTheDocument();
  expect(screen.queryByText("The Box Puzzle")).not.toBeInTheDocument();
});

test("renders currently selected pack and local level index", () => {
  const levelPacks = buildLevelPacks();

  mockSokoban({
    level: levelPacks[0].levels[1],
    levelPacks,
  });

  render(<Game />);

  const levelSelectorButton = screen.getByRole("button", { name: /open level selector/i });
  expect(within(levelSelectorButton).getByText("Test Pack")).toBeInTheDocument();
  expect(within(levelSelectorButton).getByText("2 / 2")).toBeInTheDocument();
});

test("opens level selector modal from level number button", () => {
  mockSokoban();

  render(<Game />);

  fireEvent.click(screen.getByRole("button", { name: /open level selector/i }));

  expect(screen.getByRole("dialog", { name: /level pack selector/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Test Pack" })).toBeInTheDocument();
  expect(screen.getByText("2 levels available")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /open test pack level/i })).not.toBeInTheDocument();
});

test("selecting a pack loads immediately when no progress exists", () => {
  const loadLevel = vi.fn();
  const levelPacks = buildLevelPacks();

  mockSokoban({
    hasProgress: false,
    state: State.playing,
    loadLevel,
    level: levelPacks[0].levels[1],
    levelPacks,
  });

  render(<Game />);

  fireEvent.click(screen.getByRole("button", { name: /open level selector/i }));
  fireEvent.click(screen.getByRole("button", { name: "Play Pack" }));

  expect(loadLevel).toHaveBeenCalledWith("test-pack:0");
  expect(screen.queryByRole("dialog", { name: /level pack selector/i })).not.toBeInTheDocument();
});

test("selecting a pack opens confirmation when progress exists", () => {
  const loadLevel = vi.fn();
  const levelPacks = buildLevelPacks();

  mockSokoban({
    hasProgress: true,
    state: State.playing,
    loadLevel,
    level: levelPacks[0].levels[1],
    levelPacks,
  });

  render(<Game />);

  fireEvent.click(screen.getByRole("button", { name: /open level selector/i }));
  fireEvent.click(screen.getByRole("button", { name: "Play Pack" }));

  expect(screen.getByRole("dialog", { name: /switch to selected level confirmation/i })).toBeInTheDocument();
  expect(loadLevel).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Go to Selected Level" }));
  expect(loadLevel).toHaveBeenCalledWith("test-pack:0");
});

test("renders auxiliary components", () => {
  mockSokoban();

  render(<Game />);

  expect(screen.getByTestId("help")).toBeInTheDocument();
  expect(screen.getByTestId("mobile-controls")).toBeInTheDocument();
  expect(screen.getByTestId("sfx-settings")).toBeInTheDocument();
  expect(screen.getByTestId("theme-switcher")).toBeInTheDocument();
});

test("menu opens and closes when clicking backdrop", () => {
  mockSokoban();

  render(<Game />);

  fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
  expect(screen.getByRole("dialog", { name: /game menu/i })).toBeInTheDocument();

  const backdrop = document.querySelector(`.${style.menuBackdropOpen}`);
  if (!backdrop) {
    throw new Error("Expected menu backdrop to be rendered");
  }

  fireEvent.click(backdrop);
  expect(screen.queryByRole("dialog", { name: /game menu/i })).not.toBeInTheDocument();
});

test("menu blocks movement keys and escape closes the menu", () => {
  const move = vi.fn();
  const restart = vi.fn();
  mockSokoban({ state: State.playing, move, restart });

  render(<Game />);

  fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
  expect(screen.getByRole("dialog", { name: /game menu/i })).toBeInTheDocument();

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event: arrowEvent, preventDefaultSpy: arrowPreventDefault } = createKeyboardEvent("ArrowUp");

  act(() => {
    onKeyboardEvent(arrowEvent);
  });

  expect(move).not.toHaveBeenCalled();
  expect(arrowPreventDefault).toHaveBeenCalledTimes(1);

  const { event: escapeEvent, preventDefaultSpy: escapePreventDefault } = createKeyboardEvent("Escape");

  act(() => {
    onKeyboardEvent(escapeEvent);
  });

  expect(restart).not.toHaveBeenCalled();
  expect(escapePreventDefault).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog", { name: /game menu/i })).not.toBeInTheDocument();
});

test("menu actions open sfx and about dialogs", () => {
  mockSokoban();

  render(<Game />);

  fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
  fireEvent.click(screen.getByRole("button", { name: /sfx settings/i }));

  expect(screen.getByTestId("sfx-settings")).toHaveAttribute("data-open", "true");
  expect(screen.queryByRole("dialog", { name: /game menu/i })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
  fireEvent.click(screen.getByRole("button", { name: /^about$/i }));

  expect(screen.getByTestId("help")).toHaveAttribute("data-open", "true");
});

test("keyboard Backspace triggers undo", () => {
  const undo = vi.fn();
  mockSokoban({ state: State.playing, undo });

  render(<Game />);

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("Backspace");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(undo).toHaveBeenCalledTimes(1);
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
});

test("plays crate undo sound when keyboard Backspace undo succeeds", () => {
  const undo = vi.fn(() => true);
  const playCrateUndo = vi.fn();

  mockedUseGameSounds.mockReturnValue(
    createMockGameSounds({
      playCrateUndo,
    })
  );
  mockSokoban({ state: State.playing, undo });

  render(<Game />);

  const onKeyboardEvent = getLatestKeyboardHandler();
  act(() => {
    onKeyboardEvent(createKeyboardEvent("Backspace").event);
  });

  expect(undo).toHaveBeenCalledTimes(1);
  expect(playCrateUndo).toHaveBeenCalledTimes(1);
});

test("plays crate undo sound when mobile undo succeeds", () => {
  const undo = vi.fn(() => true);
  const playCrateUndo = vi.fn();

  mockedUseGameSounds.mockReturnValue(
    createMockGameSounds({
      playCrateUndo,
    })
  );
  mockSokoban({ state: State.playing, undo });

  render(<Game />);

  fireEvent.click(screen.getByTestId("mobile-undo"));

  expect(undo).toHaveBeenCalledTimes(1);
  expect(playCrateUndo).toHaveBeenCalledTimes(1);
});

test("arrow keys trigger player movement", () => {
  const move = vi.fn();
  mockSokoban({ state: State.playing, move });

  render(<Game />);

  const onKeyboardEvent = getLatestKeyboardHandler();

  act(() => {
    onKeyboardEvent(createKeyboardEvent("ArrowUp").event);
  });
  expect(move).toHaveBeenCalledWith(Direction.Top);

  act(() => {
    onKeyboardEvent(createKeyboardEvent("ArrowDown").event);
  });
  expect(move).toHaveBeenCalledWith(Direction.Bottom);

  act(() => {
    onKeyboardEvent(createKeyboardEvent("ArrowLeft").event);
  });
  expect(move).toHaveBeenCalledWith(Direction.Left);

  act(() => {
    onKeyboardEvent(createKeyboardEvent("ArrowRight").event);
  });
  expect(move).toHaveBeenCalledWith(Direction.Right);
});

test("arrow keys are ignored while help modal is open", () => {
  const move = vi.fn();
  mockSokoban({ state: State.playing, move });

  render(<Game />);

  fireEvent.click(screen.getByTestId("help-open"));

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("ArrowUp");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(move).not.toHaveBeenCalled();
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByTestId("help-close"));

  const onKeyboardEventAfterClose = getLatestKeyboardHandler();

  act(() => {
    onKeyboardEventAfterClose(createKeyboardEvent("ArrowUp").event);
  });

  expect(move).toHaveBeenCalledWith(Direction.Top);
});

test("arrow keys are ignored while sfx modal is open", () => {
  const move = vi.fn();
  mockSokoban({ state: State.playing, move });

  render(<Game />);

  fireEvent.click(screen.getByTestId("sfx-open"));

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("ArrowRight");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(move).not.toHaveBeenCalled();
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByTestId("sfx-close"));

  const onKeyboardEventAfterClose = getLatestKeyboardHandler();

  act(() => {
    onKeyboardEventAfterClose(createKeyboardEvent("ArrowRight").event);
  });

  expect(move).toHaveBeenCalledWith(Direction.Right);
});

test("plays crate push sound when move result is crate-push", () => {
  const move = vi.fn((_: Direction): MoveOutcome => "crate-push");
  const playCratePush = vi.fn();
  const playCrateDocked = vi.fn();

  mockedUseGameSounds.mockReturnValue(
    createMockGameSounds({
      playCratePush,
      playCrateDocked,
    })
  );
  mockSokoban({ state: State.playing, move });

  render(<Game />);

  const onKeyboardEvent = getLatestKeyboardHandler();
  act(() => {
    onKeyboardEvent(createKeyboardEvent("ArrowRight").event);
  });

  expect(move).toHaveBeenCalledWith(Direction.Right);
  expect(playCratePush).toHaveBeenCalledTimes(1);
  expect(playCrateDocked).not.toHaveBeenCalled();
});

test("plays crate docked sound when move result is crate-docked", () => {
  const move = vi.fn((_: Direction): MoveOutcome => "crate-docked");
  const playCratePush = vi.fn();
  const playCrateDocked = vi.fn();

  mockedUseGameSounds.mockReturnValue(
    createMockGameSounds({
      playCratePush,
      playCrateDocked,
    })
  );
  mockSokoban({ state: State.playing, move });

  render(<Game />);

  const onKeyboardEvent = getLatestKeyboardHandler();
  act(() => {
    onKeyboardEvent(createKeyboardEvent("ArrowRight").event);
  });

  expect(move).toHaveBeenCalledWith(Direction.Right);
  expect(playCrateDocked).toHaveBeenCalledTimes(1);
  expect(playCratePush).not.toHaveBeenCalled();
});

test("plays player step sound when move result is step", () => {
  const move = vi.fn((_: Direction): MoveOutcome => "step");
  const playPlayerStep = vi.fn();
  const playPlayerBump = vi.fn();

  mockedUseGameSounds.mockReturnValue(
    createMockGameSounds({
      playPlayerStep,
      playPlayerBump,
    })
  );
  mockSokoban({ state: State.playing, move });

  render(<Game />);

  const onKeyboardEvent = getLatestKeyboardHandler();
  act(() => {
    onKeyboardEvent(createKeyboardEvent("ArrowRight").event);
  });

  expect(move).toHaveBeenCalledWith(Direction.Right);
  expect(playPlayerStep).toHaveBeenCalledTimes(1);
  expect(playPlayerBump).not.toHaveBeenCalled();
});

test("plays player bump sound when move result is blocked", () => {
  const move = vi.fn((_: Direction): MoveOutcome => "blocked");
  const playPlayerStep = vi.fn();
  const playPlayerBump = vi.fn();

  mockedUseGameSounds.mockReturnValue(
    createMockGameSounds({
      playPlayerStep,
      playPlayerBump,
    })
  );
  mockSokoban({ state: State.playing, move });

  render(<Game />);

  const onKeyboardEvent = getLatestKeyboardHandler();
  act(() => {
    onKeyboardEvent(createKeyboardEvent("ArrowRight").event);
  });

  expect(move).toHaveBeenCalledWith(Direction.Right);
  expect(playPlayerBump).toHaveBeenCalledTimes(1);
  expect(playPlayerStep).not.toHaveBeenCalled();
});

test("plays level complete sound when state changes to completed", () => {
  const playLevelComplete = vi.fn();

  mockedUseGameSounds.mockReturnValue(
    createMockGameSounds({
      playLevelComplete,
    })
  );
  mockSokoban({ state: State.playing });

  const { rerender } = render(<Game />);
  expect(playLevelComplete).not.toHaveBeenCalled();

  mockSokoban({ state: State.completed });
  rerender(<Game />);

  expect(playLevelComplete).toHaveBeenCalledTimes(1);
});

test("saves completion metrics when state changes to completed", () => {
  const saveLevelResult = vi.fn();

  mockedUseStats.mockReturnValue(
    createMockStats({
      saveLevelResult,
    })
  );

  const completedLevel = buildLevel();
  const completionMetrics = {
    moves: 12,
    timeMs: 3456,
  };

  mockSokoban({ state: State.playing, level: completedLevel, completionMetrics: null });

  const { rerender } = render(<Game />);
  expect(saveLevelResult).not.toHaveBeenCalled();

  mockSokoban({ state: State.completed, level: completedLevel, completionMetrics });
  rerender(<Game />);

  expect(saveLevelResult).toHaveBeenCalledTimes(1);
  expect(saveLevelResult).toHaveBeenCalledWith({
    levelId: completedLevel.levelId,
    puzzleId: completedLevel.puzzleId,
    moves: completionMetrics.moves,
    timeMs: completionMetrics.timeMs,
  });
});

test("saves completion metrics only once per completion transition", () => {
  const saveLevelResult = vi.fn();

  mockedUseStats.mockReturnValue(
    createMockStats({
      saveLevelResult,
    })
  );

  const completedLevel = buildLevel();
  const completionMetrics = {
    moves: 7,
    timeMs: 1234,
  };

  mockSokoban({ state: State.playing, level: completedLevel, completionMetrics: null });
  const { rerender } = render(<Game />);

  mockSokoban({ state: State.completed, level: completedLevel, completionMetrics });
  rerender(<Game />);

  mockSokoban({ state: State.completed, level: completedLevel, completionMetrics });
  rerender(<Game />);

  expect(saveLevelResult).toHaveBeenCalledTimes(1);
});

test("does not save completion metrics when they are unavailable", () => {
  const saveLevelResult = vi.fn();

  mockedUseStats.mockReturnValue(
    createMockStats({
      saveLevelResult,
    })
  );

  const completedLevel = buildLevel();

  mockSokoban({ state: State.playing, level: completedLevel, completionMetrics: null });
  const { rerender } = render(<Game />);

  mockSokoban({ state: State.completed, level: completedLevel, completionMetrics: null });
  rerender(<Game />);

  expect(saveLevelResult).not.toHaveBeenCalled();
});

test("restart confirmation opens with Escape when progress exists", () => {
  const restart = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, restart });

  render(<Game />);

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("Escape");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(screen.getByRole("dialog", { name: /restart level confirmation/i })).toBeInTheDocument();
  expect(restart).not.toHaveBeenCalled();
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Restart Level" }));
  expect(restart).toHaveBeenCalledTimes(1);
});

test("restart triggers immediately with Escape when no progress exists", () => {
  const restart = vi.fn();
  mockSokoban({ hasProgress: false, state: State.playing, restart });

  render(<Game />);

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("Escape");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(restart).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog", { name: /restart level confirmation/i })).not.toBeInTheDocument();
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
});