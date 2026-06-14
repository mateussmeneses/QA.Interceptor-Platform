/**
 * QA.Interceptor — Loading Spinner Component
 * 
 * Implements Phase FE-1 task: DSP-006 (Loading Spinner)
 * Animated loading indicator
 */

import React from "react";

export type SpinnerSize = "sm" | "m" | "lg";
export type SpinnerColor = "primary" | "success" | "warning" | "error";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spinner size */
  size?: SpinnerSize;
  /** Spinner color */
  color?: SpinnerColor;
  /** Optional label text */
  label?: string;
  /** Display mode: inline or block (full-height) */
  display?: "inline" | "block";
  /** Custom CSS class names */
  className?: string;
}

/**
 * Loading Spinner Component
 * 
 * Usage:
 *   <Spinner />
 *   <Spinner size="lg" label="Loading..." />
 *   <Spinner display="block" color="success" />
 */
export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = "m",
      color = "primary",
      label,
      display = "inline",
      className = "",
      ...rest
    },
    ref
  ) => {
    const baseClass = "spinner";
    const sizeClass = `spinner-${size}`;
    const colorClass = `spinner-${color}`;
    const displayClass = `spinner-${display}`;

    const containerClasses = [
      baseClass,
      sizeClass,
      colorClass,
      displayClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={containerClasses} {...rest}>
        <div className="spinner-ring" aria-busy="true" />
        {label && <div className="spinner-label">{label}</div>}
      </div>
    );
  }
);

Spinner.displayName = "Spinner";
