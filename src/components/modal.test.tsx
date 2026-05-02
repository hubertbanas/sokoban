import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Modal } from "./modal";

afterEach(() => {
    cleanup();
});

function renderModal(onClose = vi.fn(), autoFocusCloseButton = false) {
    const view = render(
        <Modal
            title="Test Title"
            ariaLabel="Test modal"
            onClose={onClose}
            autoFocusCloseButton={autoFocusCloseButton}
        >
            <p>Modal body content</p>
        </Modal>
    );

    return {
        ...view,
        onClose,
    };
}

test("renders accessible dialog content", () => {
    const { getByRole, getByText } = renderModal();

    expect(getByRole("dialog", { name: /test modal/i })).toBeInTheDocument();
    expect(getByRole("heading", { name: /test title/i })).toBeInTheDocument();
    expect(getByText(/modal body content/i)).toBeInTheDocument();
    expect(getByRole("button", { name: /close/i })).toBeInTheDocument();
});

test("overlay click closes the modal", () => {
    const { getByRole, onClose } = renderModal();

    fireEvent.click(getByRole("dialog", { name: /test modal/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
});

test("clicking inside modal card does not close the modal", () => {
    const { getByRole, onClose } = renderModal();

    fireEvent.click(getByRole("heading", { name: /test title/i }));

    expect(onClose).not.toHaveBeenCalled();
});

test("close button closes the modal", () => {
    const { getByRole, onClose } = renderModal();

    fireEvent.click(getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
});

test("optionally autofocuses close button", () => {
    const { getByRole } = renderModal(vi.fn(), true);

    expect(getByRole("button", { name: /close/i })).toHaveFocus();
});
