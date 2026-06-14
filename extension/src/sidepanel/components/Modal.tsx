/**
 * QA.Interceptor — Modal Component
 *
 * Overlay modal with focus trap and keyboard escape handling.
 * Implements Phase FE-1 task: MOD-001 (Modal)
 */

import React from "react";

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selectors = [
    "button:not([disabled])",
    "[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  return Array.from(container.querySelectorAll<HTMLElement>(selectors));
};

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      id: providedId,
      isOpen,
      onClose,
      title,
      description,
      closeOnBackdrop = true,
      closeOnEscape = true,
      showCloseButton = true,
      initialFocusRef,
      className = "",
      children,
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const modalId = providedId ?? generatedId;
    const panelRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (!isOpen) {
        return;
      }

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const focusTarget = initialFocusRef?.current;
      if (focusTarget) {
        focusTarget.focus();
      } else {
        const firstFocusable = panelRef.current
          ? getFocusableElements(panelRef.current)[0]
          : undefined;
        firstFocusable?.focus();
      }

      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }, [initialFocusRef, isOpen]);

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (closeOnEscape && event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    if (!isOpen) {
      return null;
    }

    const classes = ["modal", className].filter(Boolean).join(" ");
    const titleId = title ? `${modalId}-title` : undefined;
    const descriptionId = description ? `${modalId}-description` : undefined;

    return (
      <div
        className="modal-backdrop"
        onMouseDown={(event) => {
          if (!closeOnBackdrop) {
            return;
          }

          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          {...rest}
          ref={(node) => {
            panelRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          id={modalId}
          className={classes}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onKeyDown={onKeyDown}
        >
          {(title || description || showCloseButton) && (
            <div className="modal-header">
              <div className="modal-header-content">
                {title && (
                  <h2 className="modal-title" id={titleId}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="modal-description" id={descriptionId}>
                    {description}
                  </p>
                )}
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  className="modal-close"
                  onClick={onClose}
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <div className="modal-body">{children}</div>
        </div>
      </div>
    );
  }
);

Modal.displayName = "Modal";