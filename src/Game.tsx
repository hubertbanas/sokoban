import React from "react";
import "./Game.css";
import { Help } from "./components/help";
import { ThemeSwitcher } from "./components/theme-switcher";
import { useSokoban, Direction, State } from "./hooks/sokoban";
import { useKeyBoard } from "./hooks/keyboard";
import { Block } from "./hooks/levels";
import style from "./components/sokoban.module.css";
import { cn } from "./utils/classnames";
import { styleFrom, styleDirection } from "./utils/block-styles";

function useHoldToRepeat(action: () => void, delay = 320, interval = 110) {
  const timeoutRef = React.useRef<number | null>(null);
  const intervalRef = React.useRef<number | null>(null);
  const suppressNextClickRef = React.useRef(false);

  const stop = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;

      suppressNextClickRef.current = true;
      action();
      stop();

      timeoutRef.current = window.setTimeout(() => {
        intervalRef.current = window.setInterval(action, interval);
      }, delay);
    },
    [action, delay, interval, stop]
  );

  const onClick = React.useCallback(() => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    action();
  }, [action]);

  React.useEffect(() => stop, [stop]);

  return {
    onClick,
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  };
}

function Game() {
  const { index, level, state, move, next, nextLevel, previousLevel, undo, restart } = useSokoban();
  const previousButtonHandlers = useHoldToRepeat(previousLevel);
  const nextButtonHandlers = useHoldToRepeat(nextLevel);
  const boardVars = {
    "--level-width": level.width,
    "--level-height": level.height,
  } as React.CSSProperties;

  useKeyBoard(
    (event) => {
      switch (event.code) {
        case "ArrowUp":
          move(Direction.Top);
          break;
        case "ArrowDown":
          move(Direction.Bottom);
          break;
        case "ArrowLeft":
          move(Direction.Left);
          break;
        case "ArrowRight":
          move(Direction.Right);
          break;
        case "Enter":
          next();
          break;
        case "Backspace":
          undo();
          break;
        case "Escape":
          restart();
          break;
        case "BracketLeft":
          previousLevel();
          break;
        case "BracketRight":
          nextLevel();
          break;
      }
      event.preventDefault();
    },
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Enter",
      "Backspace",
      "Escape",
      "BracketLeft",
      "BracketRight",
    ]
  );
  return (
    <div className="game">
      <div className={style.header}>
        <div className={style.state}>
          <div className={style.levelPrefix}>Level {index + 1} :</div>
          <div className={style.levelTitle}>{level.name}</div>
        </div>
        <div className={style.headerActions}>
          <button
            type="button"
            className={style.levelNavButton}
            {...previousButtonHandlers}
          >
            Previous
          </button>
          <button
            type="button"
            className={style.levelNavButton}
            {...nextButtonHandlers}
          >
            Next
          </button>
          <Help />
          <ThemeSwitcher />
        </div>
      </div>

      <div className={style.boardViewport}>
        <div className={style.board} style={boardVars}>
          {level.shape.map((row) => (
            <div className={style.level}>
              {row.map((block) => (
                <div
                  className={cn(
                    style.element,
                    styleFrom(block) ?? "",
                    [Block.player, Block.playerOnObjective].includes(block)
                      ? styleDirection(level.playerDirection)
                      : ""
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {state === State.completed && (
        <div className={style.state}>
          <div className={style.levelState}>LEVEL completed </div>
          <div className={style.helpNext}>Press ENTER to load next LEVEL</div>
        </div>
      )}
    </div>
  );
}

export default Game;
