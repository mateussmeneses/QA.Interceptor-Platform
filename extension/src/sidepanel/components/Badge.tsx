/**
 * QA.Interceptor — Badge Component
 * 
 * Implements Phase FE-1 task: DSP-002 (Badge / Pill Component)
 * Small, colored tags for labels and status indicators
 */

import React from "react";

export type BadgeColor = "primary" | "success" | "warning" | "error" | "info";
export type BadgeSize = "sm" | "m";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Badge color variant */
  color?: BadgeColor;
  /** Badge size */
  size?: BadgeSize;
  /** Icon/element to display before text */
  icon?: React.ReactNode;
  /** Custom CSS class names */
  className?: string;
  /** Badge content */
  children: React.ReactNode;
}

/**
 * Badge Component
 * 
 * Usage:
 *   <Badge>Default</Badge>
 *   <Badge color="success">Active</Badge>
 *   <Badge color="error" icon={<AlertIcon />}>Critical</Badge>
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      color = "primary",
      size = "m",
      icon,
      className = "",
      children,
      ...rest
    },
    ref
  ) => {
    const baseClass = "badge";
    const colorClass = `badge-${color}`;
    const sizeClass = `badge-${size}`;

    const classes = [
      baseClass,
      colorClass,
      sizeClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <span ref={ref} className={classes} {...rest}>
        {icon && <span className="badge-icon">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
