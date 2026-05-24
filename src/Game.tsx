import React from "react";
import { Trans, useTranslation } from "react-i18next";
import "./Game.css";
import { Help } from "./components/help";
import { HamburgerMenu } from "./components/hamburger-menu";
import { MobileControls } from "./components/mobile-controls";
import { useSokoban, Direction, State } from "./hooks/sokoban";
import { useGameSounds } from "./hooks/useGameSounds";
import { useKeyBoard } from "./hooks/keyboard";
import { Block } from "./hooks/levels";
import { useStats } from "./hooks/useStats";
import style from "./components/sokoban.module.css";
import { cn } from "./utils/classnames";
import { styleFrom, styleDirection } from "./utils/block-styles";
import { Modal } from "./components/modal";
import { LevelSelectorModal } from "./components/level-selector-modal";

function formatElapsedTime(timeMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export const PLAY_STATS_STORAGE_KEY = "sokoban-play-stats-visible";
export const COMPLETION_STATS_STORAGE_KEY = "sokoban-completion-stats-visible";

function parseStoredStatsVisibility(value: string | null): boolean {
  return value === "true";
}

function getStoredStatsVisibility(storageKey: string, fallbackStorageKey?: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const storedValue = window.localStorage.getItem(storageKey);
  if (storedValue !== null) {
    return parseStoredStatsVisibility(storedValue);
  }

  if (!fallbackStorageKey) {
    return false;
  }

  return parseStoredStatsVisibility(window.localStorage.getItem(fallbackStorageKey));
}

function getInitialPlayStatsVisibility(): boolean {
  return getStoredStatsVisibility(PLAY_STATS_STORAGE_KEY);
}

function getInitialCompletionStatsVisibility(): boolean {
  // Migrate users from the previous single-toggle behavior.
  return getStoredStatsVisibility(COMPLETION_STATS_STORAGE_KEY, PLAY_STATS_STORAGE_KEY);
}

type StatsTableProps = {
  tableClassName: string;
  currentMoves: number;
  currentPushes: number;
  currentTimeMs: number;
  currentUndos: number;
  bestMoves: number | null;
  bestPushes: number | null;
  bestTimeMs: number | null;
  bestUndos: number | null;
};

function StatsTable({
  tableClassName,
  currentMoves,
  currentPushes,
  currentTimeMs,
  currentUndos,
  bestMoves,
  bestPushes,
  bestTimeMs,
  bestUndos,
}: StatsTableProps) {
  const { t } = useTranslation();
  const currentMoveValue = String(currentMoves);
  const currentPushValue = String(currentPushes);
  const currentTimeValue = formatElapsedTime(currentTimeMs);
  const currentUndoValue = String(currentUndos);
  const bestMoveValue = bestMoves === null ? "--" : String(bestMoves);
  const bestPushValue = bestPushes === null ? "--" : String(bestPushes);
  const bestTimeValue = bestTimeMs === null ? "--:--" : formatElapsedTime(bestTimeMs);
  const bestUndoValue = bestUndos === null ? "--" : String(bestUndos);

  return (
    <table className={`${style.statsTable} ${tableClassName}`}>
      <thead>
        <tr>
          <th className={style.statsHeaderCell} scope="col">{t("game.stats.header.run")}</th>
          <th className={style.statsHeaderCell} scope="col">{t("game.stats.header.moves")}</th>
          <th className={style.statsHeaderCell} scope="col">{t("game.stats.header.pushes")}</th>
          <th className={style.statsHeaderCell} scope="col">{t("game.stats.header.undos")}</th>
          <th className={style.statsHeaderCell} scope="col">{t("game.stats.header.time")}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          aria-label={t("game.stats.aria.current", {
            moves: currentMoveValue,
            pushes: currentPushValue,
            undos: currentUndoValue,
            time: currentTimeValue,
          })}
        >
          <th className={style.statsRunCell} scope="row">{t("game.stats.run.current")}</th>
          <td className={style.statsValueCell}>{currentMoveValue}</td>
          <td className={style.statsValueCell}>{currentPushValue}</td>
          <td className={style.statsValueCell}>{currentUndoValue}</td>
          <td className={style.statsValueCell}>{currentTimeValue}</td>
        </tr>
        <tr
          aria-label={t("game.stats.aria.best", {
            moves: bestMoveValue,
            pushes: bestPushValue,
            undos: bestUndoValue,
            time: bestTimeValue,
          })}
        >
          <th className={style.statsRunCell} scope="row">{t("game.stats.run.best")}</th>
          <td className={style.statsValueCell}>{bestMoveValue}</td>
          <td className={style.statsValueCell}>{bestPushValue}</td>
          <td className={style.statsValueCell}>{bestUndoValue}</td>
          <td className={style.statsValueCell}>{bestTimeValue}</td>
        </tr>
      </tbody>
    </table>
  );
}

function useHoldToRepeat(
  action: () => void,
  delay = 320,
  interval = 110,
  shouldStartOnPointerDown: () => boolean = () => true
) {
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
      if (!shouldStartOnPointerDown()) {
        if (event.pointerType === "touch" || event.pointerType === "pen") {
          suppressNextClickRef.current = true;
          action();
          event.preventDefault();
          const handleClick = (clickEvent: MouseEvent) => {
            clickEvent.preventDefault();
            clickEvent.stopPropagation();
            window.removeEventListener("click", handleClick, true);
          };
          window.addEventListener("click", handleClick, true);
          window.setTimeout(() => window.removeEventListener("click", handleClick, true), 400);
        }
        return;
      }

      suppressNextClickRef.current = true;
      action();
      stop();

      timeoutRef.current = window.setTimeout(() => {
        intervalRef.current = window.setInterval(action, interval);
      }, delay);
    },
    [action, delay, interval, shouldStartOnPointerDown, stop]
  );

  const onClick = React.useCallback(() => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    action();
  }, [action]);

  const onContextMenu = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Firefox device emulation may emit contextmenu on long mouse-press.
      // Prevent default menu without interrupting the active hold-repeat loop.
      event.preventDefault();
    },
    []
  );

  React.useEffect(() => stop, [stop]);

  return {
    onClick,
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu,
  };
}

function Game() {
  const { t } = useTranslation();
  const {
    index,
    level,
    levelPacks,
    moveCount,
    pushCount,
    undoCount,
    elapsedTimeMs,
    completionMetrics,
    state,
    move,
    next,
    nextLevel,
    previousLevel,
    loadLevel,
    undo,
    restart,
    hasProgress,
    totalLevels,
  } = useSokoban();
  const { stats, saveLevelResult, clearStats } = useStats();
  const {
    playCratePush,
    playCrateDocked,
    playCrateUndo,
    playPlayerStep,
    playPlayerBump,
    playLevelComplete,
    muted,
    volume,
    setMuted,
    setVolume,
  } = useGameSounds();
  const boardViewportRef = React.useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const completionContinueButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const completionLevelPacksButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const [tileSize, setTileSize] = React.useState(24);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  // Play statistics are optional HUD info; default off to keep the board area less noisy.
  const [showPlayStats, setShowPlayStats] = React.useState(getInitialPlayStatsVisibility);
  const [showCompletionStats, setShowCompletionStats] = React.useState(
    getInitialCompletionStatsVisibility
  );
  const [isHelpModalOpen, setIsHelpModalOpen] = React.useState(false);
  const [isLevelSelectorOpen, setIsLevelSelectorOpen] = React.useState(false);
  const isAuxModalOpen = isHelpModalOpen || isMenuOpen || isLevelSelectorOpen;

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PLAY_STATS_STORAGE_KEY, String(showPlayStats));
  }, [showPlayStats]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(COMPLETION_STATS_STORAGE_KEY, String(showCompletionStats));
  }, [showCompletionStats]);

  type PendingAction =
    | { type: "restart" }
    | { type: "previous" }
    | { type: "next" }
    | { type: "reset-stats" }
    | { type: "select-level"; levelId: string }
    | null;
  const [pendingAction, setPendingAction] = React.useState<PendingAction>(null);
  const isConfirmationDialogOpen = pendingAction !== null;

  const executePendingAction = React.useCallback(
    (action: Exclude<PendingAction, null>) => {
      switch (action.type) {
        case "restart":
          restart();
          break;
        case "previous":
          previousLevel();
          break;
        case "next":
          nextLevel();
          break;
        case "reset-stats":
          clearStats();
          break;
        case "select-level":
          loadLevel(action.levelId);
          break;
      }
    },
    [clearStats, loadLevel, nextLevel, previousLevel, restart]
  );

  const onRequestRestart = React.useCallback(() => {
    if (state !== State.playing) return;

    if (!hasProgress) {
      executePendingAction({ type: "restart" });
      return;
    }

    setPendingAction({ type: "restart" });
  }, [executePendingAction, hasProgress, state]);

  const onRequestPreviousLevel = React.useCallback(() => {
    if (state !== State.playing || !hasProgress) {
      executePendingAction({ type: "previous" });
      return;
    }

    setPendingAction({ type: "previous" });
  }, [executePendingAction, hasProgress, state]);

  const onRequestNextLevel = React.useCallback(() => {
    if (state !== State.playing || !hasProgress) {
      executePendingAction({ type: "next" });
      return;
    }

    setPendingAction({ type: "next" });
  }, [executePendingAction, hasProgress, state]);

  const onRequestLoadLevel = React.useCallback(
    (levelId: string) => {
      setIsLevelSelectorOpen(false);

      if (level.levelId === levelId) {
        return;
      }

      const pendingSelectionAction: Exclude<PendingAction, null> = {
        type: "select-level",
        levelId,
      };

      if (state !== State.playing || !hasProgress) {
        executePendingAction(pendingSelectionAction);
        return;
      }

      setPendingAction(pendingSelectionAction);
    },
    [executePendingAction, hasProgress, level.levelId, state]
  );

  const shouldUseHoldRepeat = React.useCallback(
    () => !(state === State.playing && hasProgress),
    [hasProgress, state]
  );

  const previousButtonHandlers = useHoldToRepeat(
    onRequestPreviousLevel,
    320,
    110,
    shouldUseHoldRepeat
  );
  const nextButtonHandlers = useHoldToRepeat(
    onRequestNextLevel,
    320,
    110,
    shouldUseHoldRepeat
  );

  const onConfirmAction = React.useCallback(() => {
    if (!pendingAction) return;

    executePendingAction(pendingAction);
    setPendingAction(null);
  }, [executePendingAction, pendingAction]);

  const onCancelAction = React.useCallback(() => {
    setPendingAction(null);
  }, []);

  const onToggleMenu = React.useCallback(() => {
    setIsMenuOpen((current) => !current);
  }, []);

  const onOpenLevelSelector = React.useCallback(() => {
    setIsLevelSelectorOpen(true);
  }, []);

  const onOpenLevelSelectorFromCompletion = React.useCallback(() => {
    setIsLevelSelectorOpen(true);
  }, []);

  const onCloseMenu = React.useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const onOpenLevelSelectorFromMenu = React.useCallback(() => {
    setIsMenuOpen(false);
    setIsLevelSelectorOpen(true);
  }, []);

  const onOpenAboutFromMenu = React.useCallback(() => {
    setIsMenuOpen(false);
    setIsHelpModalOpen(true);
  }, []);

  const onRequestResetStatsFromMenu = React.useCallback(() => {
    setIsMenuOpen(false);
    setPendingAction({ type: "reset-stats" });
  }, []);

  const onUndoAction = React.useCallback(() => {
    if (state !== State.playing || isAuxModalOpen || isConfirmationDialogOpen) {
      return;
    }

    const didUndo = undo();
    if (didUndo) {
      playCrateUndo();
    }
  }, [isAuxModalOpen, isConfirmationDialogOpen, playCrateUndo, state, undo]);

  const onMove = React.useCallback(
    (direction: Direction) => {
      if (state !== State.playing || isAuxModalOpen || isConfirmationDialogOpen) {
        return;
      }

      const outcome = move(direction);
      switch (outcome) {
        case "crate-docked":
          playCrateDocked();
          break;
        case "crate-push":
          playCratePush();
          break;
        case "step":
          playPlayerStep();
          break;
        case "blocked":
          playPlayerBump();
          break;
      }
    },
    [
      isAuxModalOpen,
      isConfirmationDialogOpen,
      move,
      playCrateDocked,
      playCratePush,
      playPlayerBump,
      playPlayerStep,
      state,
    ]
  );

  const previousStateRef = React.useRef(state);

  React.useEffect(() => {
    const didCompleteNow = state === State.completed && previousStateRef.current !== State.completed;

    if (didCompleteNow) {
      playLevelComplete();

      if (completionMetrics) {
        // Keep dual-key persistence even though the UI surfaces per-level Best values.
        // `levelId` powers player-facing per-level stats, while `puzzleId` keeps
        // cross-level puzzle records for future packs that may reuse layouts.
        saveLevelResult({
          levelId: level.levelId,
          puzzleId: level.puzzleId,
          moves: completionMetrics.moves,
          pushes: completionMetrics.pushes,
          timeMs: completionMetrics.timeMs,
          undos: completionMetrics.undos,
        });
      }
    }

    previousStateRef.current = state;
  }, [completionMetrics, level.levelId, level.puzzleId, playLevelComplete, saveLevelResult, state]);

  const confirmationDialog = React.useMemo(() => {
    switch (pendingAction?.type) {
      case "restart":
        return {
          title: t("game.confirmation.restart.title"),
          ariaLabel: t("game.confirmation.restart.ariaLabel"),
          warningText: t("game.confirmation.restart.warning"),
          confirmLabel: t("game.confirmation.restart.confirm"),
        };
      case "previous":
        return {
          title: t("game.confirmation.switch.title"),
          ariaLabel: t("game.confirmation.switch.previousAriaLabel"),
          warningText: t("game.confirmation.switch.warning"),
          confirmLabel: t("game.confirmation.switch.previousConfirm"),
        };
      case "next":
        return {
          title: t("game.confirmation.switch.title"),
          ariaLabel: t("game.confirmation.switch.nextAriaLabel"),
          warningText: t("game.confirmation.switch.warning"),
          confirmLabel: t("game.confirmation.switch.nextConfirm"),
        };
      case "select-level":
        return {
          title: t("game.confirmation.switch.title"),
          ariaLabel: t("game.confirmation.switch.selectedAriaLabel"),
          warningText: t("game.confirmation.switch.warning"),
          confirmLabel: t("game.confirmation.switch.selectedConfirm"),
        };
      case "reset-stats":
        return {
          title: t("game.confirmation.resetStats.title"),
          ariaLabel: t("game.confirmation.resetStats.ariaLabel"),
          warningText: t("game.confirmation.resetStats.warning"),
          confirmLabel: t("game.confirmation.resetStats.confirm"),
        };
      default:
        return null;
    }
  }, [pendingAction, t]);

  React.useEffect(() => {
    const viewport = boardViewportRef.current;
    if (!viewport) return;

    let frame = 0;
    const updateTileSize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const viewportStyle = window.getComputedStyle(viewport);
        const paddingX =
          Number.parseFloat(viewportStyle.paddingLeft) +
          Number.parseFloat(viewportStyle.paddingRight);
        const paddingY =
          Number.parseFloat(viewportStyle.paddingTop) +
          Number.parseFloat(viewportStyle.paddingBottom);
        const safetySlack = 2;
        const availableWidth = viewport.clientWidth - paddingX - safetySlack;
        const availableHeight = viewport.clientHeight - paddingY - safetySlack;
        if (availableWidth <= 0 || availableHeight <= 0) return;

        const minTileSize = 2;
        // Use a stable cap to avoid abrupt size jumps between nearby level dimensions.
        const maxTileSize = availableWidth < 768 ? 32 : 44;
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
  const tileRadius = Math.max(1, Math.min(4, Math.floor(tileSize * 0.16)));
  const boardVars = {
    "--level-width": level.width,
    "--level-height": level.height,
    "--tile-size": `${tileSize}px`,
    "--tile-gap": `${tileGap}px`,
    "--tile-radius": `${tileRadius}px`,
  } as React.CSSProperties;
  const levelCount = totalLevels ?? index + 1;
  const currentPack = React.useMemo(
    () => levelPacks.find((pack) => pack.packId === level.packId),
    [level.packId, levelPacks]
  );
  const currentPackLevelIndex = React.useMemo(() => {
    if (!currentPack) {
      return -1;
    }

    return currentPack.levels.findIndex((packLevel) => packLevel.levelId === level.levelId);
  }, [currentPack, level.levelId]);
  const isLastLevelInCurrentPack = React.useMemo(() => {
    if (!currentPack || currentPack.levels.length === 0 || currentPackLevelIndex < 0) {
      return false;
    }

    return currentPackLevelIndex === currentPack.levels.length - 1;
  }, [currentPack, currentPackLevelIndex]);
  const levelPickerPackName = currentPack?.title ?? t("game.levelPicker.fallbackPackName");
  const levelPickerNumbers = React.useMemo(() => {
    if (!currentPack || currentPack.levels.length === 0) {
      return `${index + 1} / ${levelCount}`;
    }

    const currentPackLevelNumber = currentPackLevelIndex >= 0 ? currentPackLevelIndex + 1 : 1;
    return `${currentPackLevelNumber} / ${currentPack.levels.length}`;
  }, [currentPack, currentPackLevelIndex, index, levelCount]);
  const levelBest = stats.progression[level.levelId];
  const hasLevelBestRecord =
    levelBest !== undefined &&
    levelBest.bestMovesInLevel !== null &&
    levelBest.bestTimeMsInLevel !== null;
  const levelBestMoves = hasLevelBestRecord ? levelBest.bestMovesInLevel : null;
  const levelBestPushes = levelBest?.bestPushesInLevel ?? null;
  const levelBestTimeMs = hasLevelBestRecord ? levelBest.bestTimeMsInLevel : null;
  const levelBestUndos = levelBest?.bestUndosInLevel ?? null;

  useKeyBoard(
    (event) => {
      if (isConfirmationDialogOpen) {
        if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
          const targetButton = event.code === "ArrowRight" ? confirmButtonRef.current : cancelButtonRef.current;
          if (targetButton) {
            targetButton.focus();
          }
          event.preventDefault();
          return;
        }
        if (event.code === "Enter") {
          const activeElement = document.activeElement;
          const isConfirmFocused =
            activeElement instanceof HTMLButtonElement &&
            activeElement.dataset.confirmAction === "confirm";

          if (isConfirmFocused) {
            onConfirmAction();
          } else {
            onCancelAction();
          }
        } else if (event.code === "Escape") {
          onCancelAction();
        }

        event.preventDefault();
        return;
      }

      if (isMenuOpen) {
        if (event.code === "Escape") {
          onCloseMenu();
        }

        event.preventDefault();
        return;
      }

      if (isLevelSelectorOpen) {
        const selectablePackButtons = Array.from(
          document.querySelectorAll(`.${style.levelSelectorPackPlayButton}`)
        ).filter((button): button is HTMLButtonElement =>
          button instanceof HTMLButtonElement && !button.disabled
        );

        if (event.code === "Escape") {
          setIsLevelSelectorOpen(false);
          event.preventDefault();
          return;
        }

        if (
          event.code === "ArrowUp" ||
          event.code === "ArrowDown" ||
          event.code === "ArrowLeft" ||
          event.code === "ArrowRight"
        ) {
          if (selectablePackButtons.length > 0) {
            const activeElement = document.activeElement;
            const activeIndex =
              activeElement instanceof HTMLButtonElement
                ? selectablePackButtons.indexOf(activeElement)
                : -1;
            const delta = event.code === "ArrowUp" || event.code === "ArrowLeft" ? -1 : 1;
            const nextIndex =
              activeIndex >= 0
                ? (activeIndex + delta + selectablePackButtons.length) % selectablePackButtons.length
                : delta > 0
                  ? 0
                  : selectablePackButtons.length - 1;

            selectablePackButtons[nextIndex].focus();
          }

          event.preventDefault();
          return;
        }

        if (event.code === "Enter" || event.code === "Space") {
          const activeElement = document.activeElement;

          if (activeElement instanceof HTMLButtonElement && !activeElement.disabled) {
            activeElement.click();
          } else if (selectablePackButtons.length > 0) {
            selectablePackButtons[0].click();
          }
        }

        event.preventDefault();
        return;
      }

      if (isAuxModalOpen) {
        event.preventDefault();
        return;
      }

      if (state === State.completed) {
        if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
          if (isLastLevelInCurrentPack) {
            const activeElement = document.activeElement;
            const levelPacksButton = completionLevelPacksButtonRef.current;
            const continueButton = completionContinueButtonRef.current;
            const isLevelPacksFocused = activeElement === levelPacksButton;
            const isContinueFocused = activeElement === continueButton;

            if (event.code === "ArrowRight") {
              if (isLevelPacksFocused) {
                continueButton?.focus();
              } else if (!isContinueFocused) {
                continueButton?.focus();
              }
            } else {
              if (isContinueFocused) {
                levelPacksButton?.focus();
              } else if (!isLevelPacksFocused) {
                levelPacksButton?.focus();
              }
            }
          } else {
            completionContinueButtonRef.current?.focus();
          }

          event.preventDefault();
          return;
        }

        if (event.code === "Enter" || event.code === "Space") {
          const activeElement = document.activeElement;

          if (
            isLastLevelInCurrentPack &&
            activeElement instanceof HTMLButtonElement &&
            activeElement === completionLevelPacksButtonRef.current
          ) {
            onOpenLevelSelectorFromCompletion();
          } else {
            next();
          }

          event.preventDefault();
          return;
        }
      }

      switch (event.code) {
        case "ArrowUp":
          onMove(Direction.Top);
          break;
        case "ArrowDown":
          onMove(Direction.Bottom);
          break;
        case "ArrowLeft":
          onMove(Direction.Left);
          break;
        case "ArrowRight":
          onMove(Direction.Right);
          break;
        case "Enter":
          next();
          break;
        case "Backspace":
          onUndoAction();
          break;
        case "Escape":
          onRequestRestart();
          break;
        case "BracketLeft":
          onRequestPreviousLevel();
          break;
        case "BracketRight":
          onRequestNextLevel();
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
      "Space",
      "Backspace",
      "Escape",
      "BracketLeft",
      "BracketRight",
    ]
  );
  return (
    <div className="game">
      <header className={style.topBar}>
        <div className={style.topBarActions}>
          <button
            type="button"
            className={style.menuToggleButton}
            aria-label={isMenuOpen ? t("game.menu.close") : t("game.menu.open")}
            aria-controls="game-menu"
            aria-expanded={isMenuOpen}
            onClick={onToggleMenu}
          >
            <span className={style.menuToggleGlyph} aria-hidden="true">
              <span className={style.menuToggleGlyphLine} />
              <span className={style.menuToggleGlyphLine} />
              <span className={style.menuToggleGlyphLine} />
            </span>
          </button>
        </div>

        <div className={style.levelInfo}>
          <div className={style.levelPicker} aria-label={t("game.levelPicker.label")}>
            <button
              type="button"
              className={`${style.levelNavButton} ${style.levelPickerButton}`}
              aria-label={t("game.levelPicker.previous")}
              title={t("game.levelPicker.previous")}
              {...previousButtonHandlers}
            >
              <span className={style.levelPickerChevron} aria-hidden="true">&lsaquo;</span>
            </button>

            <button
              type="button"
              className={style.levelPickerLevelButton}
              aria-label={t("game.levelPicker.openSelector")}
              title={t("game.levelPicker.openSelector")}
              onClick={onOpenLevelSelector}
            >
              <span className={style.levelPickerPackName}>{levelPickerPackName}</span>
              <span className={style.levelPickerLevelNumbers}>{levelPickerNumbers}</span>
            </button>

            <button
              type="button"
              className={`${style.levelNavButton} ${style.levelPickerButton}`}
              aria-label={t("game.levelPicker.next")}
              title={t("game.levelPicker.next")}
              {...nextButtonHandlers}
            >
              <span className={style.levelPickerChevron} aria-hidden="true">&rsaquo;</span>
            </button>
          </div>
        </div>

        <div className={style.topBarSpacer} aria-hidden="true" />
      </header>

      {showPlayStats && (
        <section className={style.bestStatsBar} aria-label={t("game.playStats.regionLabel")}>
          <StatsTable
            tableClassName={style.bestStatsRow}
            currentMoves={moveCount}
            currentPushes={pushCount}
            currentTimeMs={elapsedTimeMs}
            currentUndos={undoCount}
            bestMoves={levelBestMoves}
            bestPushes={levelBestPushes}
            bestTimeMs={levelBestTimeMs}
            bestUndos={levelBestUndos}
          />
        </section>
      )}

      <section className={style.mapArea} aria-label={t("game.board.label")}>
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

      <MobileControls onMove={onMove} onUndo={onUndoAction} onRestart={onRequestRestart} />

      <HamburgerMenu
        open={isMenuOpen}
        showPlayStats={showPlayStats}
        showCompletionStats={showCompletionStats}
        muted={muted}
        volume={volume}
        onMutedChange={setMuted}
        onVolumeChange={setVolume}
        onShowPlayStatsChange={setShowPlayStats}
        onShowCompletionStatsChange={setShowCompletionStats}
        onResetStats={onRequestResetStatsFromMenu}
        onClose={onCloseMenu}
        onOpenLevelSelector={onOpenLevelSelectorFromMenu}
        onOpenAbout={onOpenAboutFromMenu}
      />

      <Help
        open={isHelpModalOpen}
        showTrigger={false}
        onOpenChange={setIsHelpModalOpen}
      />

      <LevelSelectorModal
        open={isLevelSelectorOpen}
        onOpenChange={setIsLevelSelectorOpen}
        levelPacks={levelPacks}
        onSelectLevel={onRequestLoadLevel}
      />

      {isConfirmationDialogOpen && confirmationDialog && (
        <Modal
          title={confirmationDialog.title}
          ariaLabel={confirmationDialog.ariaLabel}
          onClose={onCancelAction}
        >
          <p className={`${style.aboutText} ${style.restartWarningText}`}>
            {confirmationDialog.warningText}
          </p>
          <div className={style.modalActions}>
            <button
              type="button"
              className={style.levelNavButton}
              onClick={onCancelAction}
              autoFocus
              ref={cancelButtonRef}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className={style.levelNavButton}
              onClick={onConfirmAction}
              data-confirm-action="confirm"
              ref={confirmButtonRef}
            >
              {confirmationDialog.confirmLabel}
            </button>
          </div>
        </Modal>
      )}

      {state === State.completed && !isLevelSelectorOpen && (
        <div
          className={style.completionOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={t("game.completion.ariaLabel")}
        >
          <div className={style.completionCard}>
            <h2 className={style.completionTitle}>
              {isLastLevelInCurrentPack
                ? t("game.completion.title.packComplete")
                : t("game.completion.title.congratulations")}
            </h2>
            <p className={style.completionText}>
              {isLastLevelInCurrentPack
                ? t("game.completion.message.packComplete")
                : t("game.completion.message.levelComplete")}
            </p>
            {isLastLevelInCurrentPack && (
              <p className={style.completionText}>
                <Trans
                  i18nKey="game.completion.message.packSwitch"
                  components={{
                    levelPacks: <span className={style.completionTextAccent} />,
                    continue: <span className={style.completionTextAccent} />,
                  }}
                />
              </p>
            )}
            {showCompletionStats && (
              <div className={style.completionStats} aria-label={t("game.playStats.runAndBestLabel")}>
                <StatsTable
                  tableClassName={style.completionStatsRow}
                  currentMoves={moveCount}
                  currentPushes={pushCount}
                  currentTimeMs={elapsedTimeMs}
                  currentUndos={undoCount}
                  bestMoves={levelBestMoves}
                  bestPushes={levelBestPushes}
                  bestTimeMs={levelBestTimeMs}
                  bestUndos={levelBestUndos}
                />
              </div>
            )}
            {isLastLevelInCurrentPack ? (
              <div className={style.completionActions}>
                <button
                  type="button"
                  className={style.levelNavButton}
                  onClick={onOpenLevelSelectorFromCompletion}
                  autoFocus
                  ref={completionLevelPacksButtonRef}
                >
                  {t("common.levelPacks")}
                </button>
                <button type="button" className={style.levelNavButton} onClick={next} ref={completionContinueButtonRef}>
                  {t("common.continue")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={style.levelNavButton}
                onClick={next}
                ref={completionContinueButtonRef}
                autoFocus
              >
                {t("common.continue")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Game;
