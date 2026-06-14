/**
 * QA.Interceptor — Confirmation Dialog Component
 *
 * Confirmation flow with safe default focus and danger variant option.
 * Implements Phase FE-1 task: MOD-003 (Confirmation dialog)
 */

import React from "react";
import { Button } from "./Button";
import { Modal, type ModalProps } from "./Modal";

export type ConfirmationVariant = "warning" | "danger";

export interface ConfirmationDialogProps
  extends Omit<ModalProps, "children" | "title" | "description"> {
  title: string;
  message: string;
  variant?: ConfirmationVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmationDialog = React.forwardRef<HTMLDivElement, ConfirmationDialogProps>(
  (
    {
      title,
      message,
      variant = "warning",
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      onConfirm,
      onCancel,
      onClose,
      ...rest
    },
    ref
  ) => {
    const cancelRef = React.useRef<HTMLButtonElement>(null);

    return (
      <Modal
        ref={ref}
        title={title}
        description={message}
        onClose={onClose}
        initialFocusRef={cancelRef as React.RefObject<HTMLElement>}
        {...rest}
      >
        <div className="confirmation-dialog-body" />
        <div className="dialog-actions">
          <Button
            ref={cancelRef}
            type="button"
            variant="secondary"
            onClick={onCancel ?? onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    );
  }
);

ConfirmationDialog.displayName = "ConfirmationDialog";