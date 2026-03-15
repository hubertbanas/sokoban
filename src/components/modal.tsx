import React from "react";
import style from "./sokoban.module.css";

type ModalProps = {
    title: string;
    ariaLabel: string;
    onClose: () => void;
    children: React.ReactNode;
};

function Modal({ title, ariaLabel, onClose, children }: ModalProps) {
    return (
        <div
            className={style.modalOverlay}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            onClick={onClose}
        >
            <div className={style.modalCard} onClick={(event) => event.stopPropagation()}>
                <div className={style.modalHeader}>
                    <h2 className={style.modalTitle}>{title}</h2>
                    <button
                        type="button"
                        className={style.modalCloseButton}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className={style.modalBody}>{children}</div>
            </div>
        </div>
    );
}

export { Modal };
