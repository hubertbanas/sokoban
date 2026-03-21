import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, cleanup, act } from "@testing-library/react";
import { vi, expect, test, beforeAll, beforeEach, afterEach } from "vitest";
import Game from "./Game";
import { Block } from "./hooks/levels";
import { Direction, State, useSokoban } from "./hooks/sokoban";
import { useKeyBoard } from "./hooks/keyboard";

vi.mock("./hooks/keyboard", () => ({
  useKeyBoard: vi.fn(),
}));

vi.mock("./components/help", () => ({
  Help: () => <div data-testid="help" />,
}));

vi.mock("./components/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));

vi.mock("./components/mobile-controls", () => ({
  MobileControls: () => <div data-testid="mobile-controls" />,
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

function mockSokoban(overrides: Partial<ReturnType<typeof useSokoban>> = {}) {
  const defaults = {
    index: 0,
    level: buildLevel(),
    state: State.playing,
    hasProgress: false,
    move: vi.fn(),
    next: vi.fn(),
    nextLevel: vi.fn(),
    previousLevel: vi.fn(),
    undo: vi.fn(),
    restart: vi.fn(),
  };

  const value = { ...defaults, ...overrides };
  mockedUseSokoban.mockReturnValue(value);
  return value;
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
});

afterEach(() => {
  cleanup();
});

test("next level confirmation opens on click, not pointerdown, when progress exists", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, nextLevel });

  render(<Game />);
  const nextButton = screen.getByRole("button", { name: "Next" });

  fireEvent.pointerDown(nextButton, { button: 0, pointerId: 1 });
  expect(screen.queryByRole("dialog", { name: /switch to next level confirmation/i })).not.toBeInTheDocument();
  expect(nextLevel).not.toHaveBeenCalled();

  fireEvent.click(nextButton);
  expect(screen.getByRole("dialog", { name: /switch to next level confirmation/i })).toBeInTheDocument();
  expect(nextLevel).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Next Level" }));
  expect(nextLevel).toHaveBeenCalledTimes(1);
});

test("next level triggers immediately on pointerdown when no progress exists", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: false, state: State.playing, nextLevel });

  render(<Game />);
  const nextButton = screen.getByRole("button", { name: "Next" });

  fireEvent.pointerDown(nextButton, { button: 0, pointerId: 1 });

  expect(nextLevel).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog", { name: /switch to next level confirmation/i })).not.toBeInTheDocument();
});

test("previous level confirmation opens on click, not pointerdown, when progress exists", () => {
  const previousLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, previousLevel });

  render(<Game />);
  const previousButton = screen.getByRole("button", { name: "Previous" });

  fireEvent.pointerDown(previousButton, { button: 0, pointerId: 1 });
  expect(screen.queryByRole("dialog", { name: /switch to previous level confirmation/i })).not.toBeInTheDocument();
  expect(previousLevel).not.toHaveBeenCalled();

  fireEvent.click(previousButton);
  expect(screen.getByRole("dialog", { name: /switch to previous level confirmation/i })).toBeInTheDocument();
  expect(previousLevel).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Previous Level" }));
  expect(previousLevel).toHaveBeenCalledTimes(1);
});

test("previous level triggers immediately on pointerdown when no progress exists", () => {
  const previousLevel = vi.fn();
  mockSokoban({ hasProgress: false, state: State.playing, previousLevel });

  render(<Game />);
  const previousButton = screen.getByRole("button", { name: "Previous" });

  fireEvent.pointerDown(previousButton, { button: 0, pointerId: 1 });

  expect(previousLevel).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog", { name: /switch to previous level confirmation/i })).not.toBeInTheDocument();
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
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("dialog", { name: /switch to next level confirmation/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("dialog", { name: /switch to next level confirmation/i })).not.toBeInTheDocument();
  expect(nextLevel).not.toHaveBeenCalled();
});

test("escape closes confirmation dialog", () => {
  const nextLevel = vi.fn();
  mockSokoban({ hasProgress: true, state: State.playing, nextLevel });

  render(<Game />);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
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
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  const confirmButton = screen.getByRole("button", { name: "Next Level" });
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
  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  const onKeyboardEvent = getLatestKeyboardHandler();
  const { event, preventDefaultSpy } = createKeyboardEvent("Enter");

  act(() => {
    onKeyboardEvent(event);
  });

  expect(nextLevel).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog", { name: /switch to next level confirmation/i })).not.toBeInTheDocument();
  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
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

test("renders correct level number and title", () => {
  mockSokoban({
    index: 4,
    level: {
      ...buildLevel(),
      name: "The Box Puzzle",
    },
  });

  render(<Game />);

  expect(screen.getByText("Level 5")).toBeInTheDocument();
  expect(screen.getByText("The Box Puzzle")).toBeInTheDocument();
});

test("renders auxiliary components", () => {
  mockSokoban();

  render(<Game />);

  expect(screen.getByTestId("help")).toBeInTheDocument();
  expect(screen.getByTestId("mobile-controls")).toBeInTheDocument();
  expect(screen.getByTestId("theme-switcher")).toBeInTheDocument();
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