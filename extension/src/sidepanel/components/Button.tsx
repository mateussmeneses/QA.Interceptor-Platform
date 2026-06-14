/**
 * QA.Interceptor — Button Component
 * 
 * Reusable button component with multiple variants and sizes
 * Implements Phase FE-1 task: BTN-001 to BTN-005
 */

import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "compact";
export type ButtonSize = "sm" | "m" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Show loading spinner */
  isLoading?: boolean;
  /** Custom CSS class names */
  className?: string;
  /** Button content */
  children: React.ReactNode;
}

/**
 * Button Component
 * 
 * Usage:
 *   <Button>Click me</Button>
 *   <Button variant="primary" size="lg">Large primary button</Button>
 *   <Button variant="danger" onClick={handleDelete}>Delete</Button>
 *   <Button isLoading>Saving...</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "m",
      isLoading = false,
      disabled = false,
      className = "",
      children,
      ...rest
    },
    ref
  ) => {
    const baseClass = "btn";
    const variantClass = `btn-${variant}`;
    const sizeClass = `btn-${size}`;
    const disabledClass = disabled || isLoading ? "btn-disabled" : "";

    const classes = [
      baseClass,
      variantClass,
      sizeClass,
      disabledClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        type="button"
        {...rest}
      >
        {isLoading ? (
          <>
            <span className="btn-spinner" aria-hidden="true"></span>
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

/**
 * Preset button variants for common use cases
 */

interface PrimaryButtonProps extends Omit<ButtonProps, "variant"> {}
export const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  (props, ref) => <Button ref={ref} variant="primary" {...props} />
);
PrimaryButton.displayName = "PrimaryButton";

interface SecondaryButtonProps extends Omit<ButtonProps, "variant"> {}
export const SecondaryButton = React.forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  (props, ref) => <Button ref={ref} variant="secondary" {...props} />
);
SecondaryButton.displayName = "SecondaryButton";

interface DangerButtonProps extends Omit<ButtonProps, "variant"> {}
export const DangerButton = React.forwardRef<HTMLButtonElement, DangerButtonProps>(
  (props, ref) => <Button ref={ref} variant="danger" {...props} />
);
DangerButton.displayName = "DangerButton";

interface IconButtonProps extends Omit<ButtonProps, "variant"> {}
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (props, ref) => <Button ref={ref} variant="compact" size="sm" {...props} />
);
IconButton.displayName = "IconButton";
