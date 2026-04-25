import React, { useEffect, useState } from "react";
import style from "./sokoban.module.css";
import { Modal } from "./modal";

type HelpProps = {
  onOpenChange?: (open: boolean) => void;
};

function HelpImpl({ onOpenChange }: HelpProps) {
  const [open, setOpen] = useState(false);
  const suppressNextClickRef = React.useRef(false);

  const openAbout = React.useCallback(() => setOpen(true), []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const handleClick = React.useCallback(() => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    openAbout();
  }, [openAbout]);

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;

      suppressNextClickRef.current = true;
      openAbout();
      event.preventDefault();

      const suppressClick = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        window.removeEventListener("click", suppressClick, true);
      };

      window.addEventListener("click", suppressClick, true);
      window.setTimeout(() => window.removeEventListener("click", suppressClick, true), 400);
    },
    [openAbout]
  );

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
        onClick={handleClick}
        onPointerDown={handlePointerDown}
      >
        About
      </button>

      {open && (
        <Modal
          title="About"
          ariaLabel="About Sokoban"
          onClose={() => setOpen(false)}
          autoFocusCloseButton
        >
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
              <div>[&nbsp;/&nbsp;]</div>
              <div>Previous / Next Level</div>
            </div>
          </section>
        </Modal>
      )}
    </>
  );
}

export const Help = React.memo(HelpImpl);