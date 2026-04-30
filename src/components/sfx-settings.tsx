import React from "react";
import style from "./sokoban.module.css";
import { Modal } from "./modal";

type SfxSettingsProps = {
    muted: boolean;
    volume: number;
    onMutedChange: (muted: boolean) => void;
    onVolumeChange: (volume: number) => void;
    open?: boolean;
    showTrigger?: boolean;
    onOpenChange?: (open: boolean) => void;
};

function SfxSettingsImpl({
    muted,
    volume,
    onMutedChange,
    onVolumeChange,
    open: controlledOpen,
    showTrigger = true,
    onOpenChange,
}: SfxSettingsProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const sliderId = React.useId();
    const toggleId = React.useId();

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const volumePercent = Math.round(volume * 100);

    const setOpen = React.useCallback((nextOpen: boolean) => {
        if (!isControlled) {
            setInternalOpen(nextOpen);
        }

        onOpenChange?.(nextOpen);
    }, [isControlled, onOpenChange]);

    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code === "Escape") {
                setOpen(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, setOpen]);

    return (
        <>
            {showTrigger && (
                <button
                    type="button"
                    className={style.levelNavButton}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    onClick={() => setOpen(true)}
                >
                    SFX
                </button>
            )}

            {open && (
                <Modal
                    title="Sound Effects"
                    ariaLabel="Sound effects settings"
                    onClose={() => setOpen(false)}
                    autoFocusCloseButton
                >
                    <section className={style.sfxPanel} aria-label="Sound effect settings">
                        <label className={style.sfxRow} htmlFor={toggleId}>
                            <span className={style.sfxLabel}>Mute SFX</span>
                            <input
                                id={toggleId}
                                type="checkbox"
                                checked={muted}
                                onChange={(event) => onMutedChange(event.target.checked)}
                            />
                        </label>

                        <label className={style.sfxRow} htmlFor={sliderId}>
                            <span className={style.sfxLabel}>Volume</span>
                            <span className={style.sfxValue}>{volumePercent}%</span>
                        </label>
                        <input
                            id={sliderId}
                            className={style.sfxSlider}
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={volumePercent}
                            onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
                            disabled={muted}
                        />
                    </section>
                </Modal>
            )}
        </>
    );
}

export const SfxSettings = React.memo(SfxSettingsImpl);
