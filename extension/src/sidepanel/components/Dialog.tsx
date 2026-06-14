/**
 * QA.Interceptor — Dialog Component
 *
 * Form-friendly modal with header, content and actions.
 * Implements Phase FE-1 task: MOD-002 (Dialog/form modal)
 */

import React from "react";
import { Button } from "./Button";
import { Modal, type ModalProps } from "./Modal";

export interface DialogProps
  extends Omit<ModalProps, "children" | "title" | "description"> {
  title: string;
  description?: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
}

export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  (
    {
      title,
      description,
      children,
      confirmLabel = "OK",
      cancelLabel = "Cancel",
      onConfirm,
      onCancel,
      confirmDisabled = false,
      cancelDisabled = false,
      onClose,
      ...rest
    },
    ref
  ) => {
    return (
      <Modal ref={ref} title={title} description={description} onClose={onClose} {...rest}>
        <div className="dialog-content">{children}</div>
        <div className="dialog-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel ?? onClose}
            disabled={cancelDisabled}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    );
  }
);

Dialog.displayName = "Dialog";