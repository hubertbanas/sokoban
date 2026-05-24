import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import style from "./sokoban.module.css";
import { Modal } from "./modal";

type HelpProps = {
  open?: boolean;
  showTrigger?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function HelpImpl({ open: controlledOpen, showTrigger = true, onOpenChange }: HelpProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const suppressNextClickRef = React.useRef(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  const openAbout = React.useCallback(() => setOpen(true), [setOpen]);

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
  }, [open, setOpen]);

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          className={style.aboutButton}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
        >
          {t("common.about")}
        </button>
      )}

      {open && (
        <Modal
          title={t("help.title")}
          ariaLabel={t("help.ariaLabel")}
          onClose={() => setOpen(false)}
          autoFocusCloseButton
        >
          {/* Version Number Injection */}
          <div style={{ textAlign: "center", marginBottom: "16px", color: "gray", fontSize: "0.9em" }}>
            {t("common.version", { version: __APP_VERSION__ })}
          </div>

          <section className={style.aboutSection} aria-label={t("help.sections.projectLinks")}>
            <h3 className={style.aboutSectionTitle}>{t("help.builtWithTitle")}</h3>
            <p className={style.aboutText}>{t("help.builtWithText")}</p>
            <h3 className={style.aboutSectionTitle}>{t("help.projectTitle")}</h3>
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

          <section className={style.aboutSection} aria-label={t("help.sections.controls")}>
            <h3 className={style.aboutSectionTitle}>{t("help.controlsTitle")}</h3>
            <div className={style.helpRows}>
              <div>&uarr;</div>
              <div>{t("help.controlLabels.moveUp")}</div>
              <div>&larr;&nbsp;&rarr;</div>
              <div>{t("help.controlLabels.moveLeftRight")}</div>
              <div>&darr;</div>
              <div>{t("help.controlLabels.moveDown")}</div>
              <div>Backspace</div>
              <div>{t("help.controlLabels.undo")}</div>
              <div>Escape</div>
              <div>{t("help.controlLabels.restartLevel")}</div>
              <div>[&nbsp;/&nbsp;]</div>
              <div>{t("help.controlLabels.previousNextLevel")}</div>
            </div>
          </section>
        </Modal>
      )}
    </>
  );
}

export const Help = React.memo(HelpImpl);