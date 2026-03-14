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
  const boardViewportRef = React.useRef<HTMLDivElement | null>(null);
  const [tileSize, setTileSize] = React.useState(24);

  React.useEffect(() => {
    const viewport = boardViewportRef.current;
    if (!viewport) return;

    let frame = 0;
    const updateTileSize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const availableWidth = viewport.clientWidth;
        const availableHeight = viewport.clientHeight;
        if (availableWidth <= 0 || availableHeight <= 0) return;

        const minTileSize = 2;
        const maxTileSize = 34;
        const preferredGap = availableWidth < 768 ? 0.5 : 1;
        const widthPerTile =
          (availableWidth - level.width * preferredGap * 2) / level.width;
        const heightPerTile =
          (availableHeight - level.height * preferredGap * 2) / level.height;
        const nextSize = Math.max(
          minTileSize,
          Math.min(maxTileSize, Math.floor(Math.min(widthPerTile, heightPerTile)))
        );

        setTileSize((current) => (current === nextSize ? current : nextSize));
      });
    };

    updateTileSize();

    const observer = new ResizeObserver(updateTileSize);
    observer.observe(viewport);
    window.addEventListener("orientationchange", updateTileSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", updateTileSize);
      window.cancelAnimationFrame(frame);
    };
  }, [level.width, level.height]);

  const tileGap = tileSize < 12 ? 0.5 : 1;
  const boardVars = {
    "--level-width": level.width,
    "--level-height": level.height,
    "--tile-size": `${tileSize}px`,
    "--tile-gap": `${tileGap}px`,
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
      <header className={style.topBar}>
        <div className={style.levelInfo}>
          <div className={style.levelNumber}>Level {index + 1}</div>
          <div className={style.levelTitle}>{level.name}</div>
          {state === State.completed && (
            <div className={style.completedState}>Completed, press Enter for next level</div>
          )}
        </div>
        <div className={style.topBarActions}>
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
      </header>

      <section className={style.mapArea} aria-label="Sokoban board">
        <div className={style.boardViewport} ref={boardViewportRef}>
          <div className={style.board} style={boardVars}>
            {level.shape.map((row, rowIndex) => (
              <div className={style.level} key={`row-${rowIndex}`}>
                {row.map((block, blockIndex) => (
                  <div
                    key={`tile-${rowIndex}-${blockIndex}`}
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
      </section>
    </div>
  );
}

export default Game;
