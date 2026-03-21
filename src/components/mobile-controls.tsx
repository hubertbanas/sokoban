import React from "react";
import { Direction } from "../hooks/sokoban";
import style from "./sokoban.module.css";

type MobileControlsProps = {
    onMove: (direction: Direction) => void;
    onUndo: () => void;
    onRestart: () => void;
};

type Position = {
    x: number;
    y: number;
};

const STORAGE_KEY = "sokoban.mobile-controls.position";
const EDGE_PADDING = 10;
const FALLBACK_WIDTH = 168;
const FALLBACK_HEIGHT = 220;

function useHoldToRepeat(action: () => void, delay = 160, interval = 95) {
    const actionRef = React.useRef(action);
    const timeoutRef = React.useRef<number | null>(null);
    const intervalRef = React.useRef<number | null>(null);
    const suppressNextClickRef = React.useRef(false);
    const activePointerIdRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        actionRef.current = action;
    }, [action]);

    const stop = React.useCallback(() => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        activePointerIdRef.current = null;
    }, []);

    const start = React.useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            if (event.button !== 0) return;

            activePointerIdRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);

            suppressNextClickRef.current = true;
            actionRef.current();
            stop();
            activePointerIdRef.current = event.pointerId;

            timeoutRef.current = window.setTimeout(() => {
                intervalRef.current = window.setInterval(() => {
                    actionRef.current();
                }, interval);
            }, delay);
        },
        [delay, interval, stop]
    );

    const stopByPointer = React.useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            if (activePointerIdRef.current !== event.pointerId) return;

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
            stop();
        },
        [stop]
    );

    const onContextMenu = React.useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            // Firefox device emulation can emit contextmenu on long mouse-press.
            // Prevent it without interrupting the active hold-repeat loop.
            event.preventDefault();
        },
        []
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
        onPointerUp: stopByPointer,
        onPointerCancel: stopByPointer,
        onLostPointerCapture: stop,
        onContextMenu,
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function parseStoredPosition(raw: string | null): Position | null {
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as Partial<Position>;
        if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
            return null;
        }

        return { x: parsed.x, y: parsed.y };
    } catch {
        return null;
    }
}

function MobileControls({ onMove, onUndo, onRestart }: MobileControlsProps) {
    const controlsRef = React.useRef<HTMLDivElement | null>(null);
    const dragRef = React.useRef<{
        pointerId: number;
        offsetX: number;
        offsetY: number;
    } | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const clampPosition = React.useCallback((candidate: Position): Position => {
        const controlWidth = controlsRef.current?.offsetWidth ?? FALLBACK_WIDTH;
        const controlHeight = controlsRef.current?.offsetHeight ?? FALLBACK_HEIGHT;
        const maxX = Math.max(EDGE_PADDING, window.innerWidth - controlWidth - EDGE_PADDING);
        const maxY = Math.max(EDGE_PADDING, window.innerHeight - controlHeight - EDGE_PADDING);

        return {
            x: clamp(candidate.x, EDGE_PADDING, maxX),
            y: clamp(candidate.y, EDGE_PADDING, maxY),
        };
    }, []);

    const getDefaultPosition = React.useCallback((): Position => {
        const initial = {
            x: window.innerWidth - FALLBACK_WIDTH - EDGE_PADDING - 6,
            y: window.innerHeight - FALLBACK_HEIGHT - EDGE_PADDING - 6,
        };

        return clampPosition(initial);
    }, [clampPosition]);

    const [position, setPosition] = React.useState<Position>(() => {
        if (typeof window === "undefined") {
            return { x: EDGE_PADDING, y: EDGE_PADDING };
        }

        const stored = parseStoredPosition(window.localStorage.getItem(STORAGE_KEY));
        if (!stored) {
            return {
                x: Math.max(EDGE_PADDING, window.innerWidth - FALLBACK_WIDTH - EDGE_PADDING - 6),
                y: Math.max(EDGE_PADDING, window.innerHeight - FALLBACK_HEIGHT - EDGE_PADDING - 6),
            };
        }

        return stored;
    });

    React.useEffect(() => {
        const updateClampedPosition = () => {
            setPosition((current) => clampPosition(current));
        };

        updateClampedPosition();
        window.addEventListener("resize", updateClampedPosition);
        window.addEventListener("orientationchange", updateClampedPosition);

        return () => {
            window.removeEventListener("resize", updateClampedPosition);
            window.removeEventListener("orientationchange", updateClampedPosition);
        };
    }, [clampPosition]);

    React.useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }, [position]);

    const upHandlers = useHoldToRepeat(() => onMove(Direction.Top));
    const downHandlers = useHoldToRepeat(() => onMove(Direction.Bottom));
    const leftHandlers = useHoldToRepeat(() => onMove(Direction.Left));
    const rightHandlers = useHoldToRepeat(() => onMove(Direction.Right));
    const undoHandlers = useHoldToRepeat(onUndo, 250, 110);

    const onDragPointerDown = React.useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            if (event.button !== 0) return;

            const rect = controlsRef.current?.getBoundingClientRect();
            if (!rect) return;

            dragRef.current = {
                pointerId: event.pointerId,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
            };

            setIsDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
        },
        []
    );

    const onDragPointerMove = React.useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            const dragState = dragRef.current;
            if (!dragState || dragState.pointerId !== event.pointerId) return;

            const nextPosition = clampPosition({
                x: event.clientX - dragState.offsetX,
                y: event.clientY - dragState.offsetY,
            });

            setPosition(nextPosition);
            event.preventDefault();
        },
        [clampPosition]
    );

    const onDragPointerEnd = React.useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            const dragState = dragRef.current;
            if (!dragState || dragState.pointerId !== event.pointerId) return;

            dragRef.current = null;
            setIsDragging(false);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
            setPosition((current) => clampPosition(current));
        },
        [clampPosition]
    );

    const onResetPosition = React.useCallback(() => {
        setPosition(getDefaultPosition());
    }, [getDefaultPosition]);

    const onHandleContextMenu = React.useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            dragRef.current = null;
            setIsDragging(false);
        },
        []
    );

    const onRestartContextMenu = React.useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
        },
        []
    );

    return (
        <div
            ref={controlsRef}
            className={`${style.mobileControlsShell} ${isDragging ? style.mobileControlsShellDragging : ""}`}
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            aria-label="Touch controls"
            role="group"
        >
            <div className={style.mobileControlActions}>
                <button
                    type="button"
                    aria-label="Undo move"
                    className={style.mobileControlActionButton}
                    {...undoHandlers}
                >
                    Undo
                </button>
                <button
                    type="button"
                    aria-label="Restart level"
                    className={style.mobileControlActionButton}
                    onClick={onRestart}
                    onContextMenu={onRestartContextMenu}
                >
                    Restart
                </button>
            </div>

            <div className={style.mobileControls}>
                <button
                    type="button"
                    aria-label="Move up"
                    className={`${style.mobileControlButton} ${style.mobileControlUp}`}
                    {...upHandlers}
                >
                    U
                </button>
                <button
                    type="button"
                    aria-label="Move left"
                    className={`${style.mobileControlButton} ${style.mobileControlLeft}`}
                    {...leftHandlers}
                >
                    L
                </button>
                <button
                    type="button"
                    aria-label="Move right"
                    className={`${style.mobileControlButton} ${style.mobileControlRight}`}
                    {...rightHandlers}
                >
                    R
                </button>
                <button
                    type="button"
                    aria-label="Move down"
                    className={`${style.mobileControlButton} ${style.mobileControlDown}`}
                    {...downHandlers}
                >
                    D
                </button>
                <button
                    type="button"
                    aria-label="Drag to move controls"
                    title="Drag to reposition. Double tap to reset."
                    className={style.mobileControlHandle}
                    onPointerDown={onDragPointerDown}
                    onPointerMove={onDragPointerMove}
                    onPointerUp={onDragPointerEnd}
                    onPointerCancel={onDragPointerEnd}
                    onDoubleClick={onResetPosition}
                    onContextMenu={onHandleContextMenu}
                >
                    <span className={style.screenReaderOnly}>Reposition controls</span>
                </button>
            </div>
        </div>
    );
}

export { MobileControls };
