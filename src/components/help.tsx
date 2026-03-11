import React, { useEffect, useState } from "react";
import style from "./sokoban.module.css";

function HelpImpl() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={style.aboutButton}
        onClick={() => setOpen(true)}
      >
        About
      </button>

      {open && (
        <div className={style.modalOverlay} onClick={() => setOpen(false)}>
          <div
            className={style.modalCard}
            role="dialog"
            aria-modal="true"
            aria-label="About Sokoban"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={style.modalHeader}>
              <h2 className={style.modalTitle}>About</h2>
              <button
                type="button"
                className={style.modalCloseButton}
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={style.modalBody}>
              <div className={style.helpRows}>
                <div>&uarr;</div>
                <div>Move up</div>
                <div>&larr;&nbsp;&rarr;</div>
                <div>Move left / right</div>
                <div>&darr;</div>
                <div>Move down</div>
                <div>Backspace</div>
                <div>Undo</div>
                <div>Escape</div>
                <div>Restart level</div>
                <div>Enter</div>
                <div>Next level (after completion)</div>
                <div>[</div>
                <div>Previous level</div>
                <div>]</div>
                <div>Next level</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const Help = React.memo(HelpImpl);
