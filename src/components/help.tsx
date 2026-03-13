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
              {/* Version Number Injection */}
              <div style={{ textAlign: "center", marginBottom: "16px", color: "gray", fontSize: "0.9em" }}>
                Version {__APP_VERSION__}
              </div>

              <section className={style.aboutSection} aria-label="Project links">
                <h3 className={style.aboutSectionTitle}>Built with</h3>
                <p className={style.aboutText}>React, TypeScript, and Vite.</p>
                <h3 className={style.aboutSectionTitle}>Project</h3>
                <div className={style.aboutLinks}>
                  <a
                    className={style.aboutLink}
                    href="https://github.com/hubertbanas/sokoban"
                    target="_blank"
                    rel="noreferrer"
                  >
                    github.com/hubertbanas/sokoban
                  </a>
                </div>
              </section>

              <section className={style.aboutSection} aria-label="Controls">
                <h3 className={style.aboutSectionTitle}>Controls</h3>
                <div className={style.helpRows}>
                  <div>&uarr;</div>
                  <div>Move Up</div>
                  <div>&larr;&nbsp;&rarr;</div>
                  <div>Move Left / Right</div>
                  <div>&darr;</div>
                  <div>Move Down</div>
                  <div>Backspace</div>
                  <div>Undo</div>
                  <div>Escape</div>
                  <div>Restart Level</div>
                  <div>Enter</div>
                  <div>Next Level (after completion)</div>
                  <div>[&nbsp;/&nbsp;]</div>
                  <div>Previous / Next Level</div>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const Help = React.memo(HelpImpl);