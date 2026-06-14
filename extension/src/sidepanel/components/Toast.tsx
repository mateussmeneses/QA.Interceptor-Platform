/**
 * QA.Interceptor — Toast Component
 *
 * Temporary notifications with optional auto-dismiss.
 * Implements Phase FE-1 task: DSP-007 (Toast/Notification)
 */

import React from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: ToastType;
  title?: string;
  message: string;
  isOpen?: boolean;
  durationMs?: number;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      type = "info",
      title,
      message,
      isOpen = true,
      durationMs = 4000,
      onClose,
      actionLabel,
      onAction,
      className = "",
      ...rest
    },
    ref
  ) => {
    React.useEffect(() => {
      if (!isOpen || durationMs <= 0 || !onClose) {
        return;
      }

      const timer = window.setTimeout(() => {
        onClose();
      }, durationMs);

      return () => {
        window.clearTimeout(timer);
      };
    }, [durationMs, isOpen, onClose]);

    if (!isOpen) {
      return null;
    }

    const classes = [
      "toast",
      `toast-${type}`,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        {...rest}
        ref={ref}
        className={classes}
        role={type === "error" || type === "warning" ? "alert" : "status"}
        aria-live={type === "error" || type === "warning" ? "assertive" : "polite"}
      >
        <div className="toast-content">
          {title && <div className="toast-title">{title}</div>}
          <div className="toast-message">{message}</div>
        </div>

        <div className="toast-actions">
          {actionLabel && onAction && (
            <button type="button" className="toast-action-btn" onClick={onAction}>
              {actionLabel}
            </button>
          )}
          <button type="button" className="toast-close-btn" onClick={onClose} aria-label="Close notification">
            ✕
          </button>
        </div>
      </div>
    );
  }
);

Toast.displayName = "Toast";