/**
 * QA.Interceptor — Card Component
 * 
 * Implements Phase FE-1 task: DSP-001 (Card Component)
 * Base component for displaying content in containers
 */

import React from "react";

export type CardVariant = "default" | "elevated" | "outlined";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card style variant */
  variant?: CardVariant;
  /** Show hover effect */
  isHoverable?: boolean;
  /** Custom CSS class names */
  className?: string;
  /** Card content */
  children: React.ReactNode;
}

/**
 * Card Component
 * 
 * Usage:
 *   <Card>Simple card content</Card>
 *   <Card variant="elevated" isHoverable>Elevated card</Card>
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      isHoverable = false,
      className = "",
      children,
      ...rest
    },
    ref
  ) => {
    const baseClass = "card";
    const variantClass = `card-${variant}`;
    const hoverClass = isHoverable ? "card-hoverable" : "";

    const classes = [
      baseClass,
      variantClass,
      hoverClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={classes} {...rest}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
