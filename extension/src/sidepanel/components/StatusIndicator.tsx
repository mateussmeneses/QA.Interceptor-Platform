/**
 * QA.Interceptor — Status Indicator Component
 * 
 * Implements Phase FE-1 task: DSP-003 (Status Indicator)
 * Visual indicator for status states: active, inactive, pending, error
 */

import React from "react";

export type StatusState = "active" | "inactive" | "pending" | "error";

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Status state */
  status?: StatusState;
  /** Show pulse animation for active state */
  pulse?: boolean;
  /** Indicator size */
  size?: "sm" | "m" | "lg";
  /** Optional label text */
  label?: string;
  /** Custom CSS class names */
  className?: string;
}

/**
 * Status Indicator Component
 * 
 * Usage:
 *   <StatusIndicator status="active" label="Connected" />
 *   <StatusIndicator status="error" pulse />
 */
export const StatusIndicator = React.forwardRef<HTMLSpanElement, StatusIndicatorProps>(
  (
    {
      status = "inactive",
      pulse = false,
      size = "m",
      label,
      className = "",
      ...rest
    },
    ref
  ) => {
    const baseClass = "status-indicator";
    const statusClass = `status-${status}`;
    const sizeClass = `status-${size}`;
    const pulseClass = pulse && status === "active" ? "status-pulse" : "";

    const containerClasses = [
      baseClass,
      statusClass,
      sizeClass,
      pulseClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <span ref={ref} className={containerClasses} {...rest}>
        <span className="status-dot" />
        {label && <span className="status-label">{label}</span>}
      </span>
    );
  }
);

StatusIndicator.displayName = "StatusIndicator";
