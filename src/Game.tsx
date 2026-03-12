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

function Game() {
  const { index, level, state, move, next, nextLevel, previousLevel, undo, restart } = useSokoban();
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
            onClick={previousLevel}
          >
            Previous
          </button>
          <button
            type="button"
            className={style.levelNavButton}
            onClick={nextLevel}
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
