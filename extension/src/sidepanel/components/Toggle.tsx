/**
 * QA.Interceptor — Toggle/Switch Component
 * 
 * Implements Phase FE-1 task: INP-004 (Toggle/Switch)
 * Binary choice toggle switch
 */

import React from "react";

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Toggle label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Size variant */
  size?: "sm" | "m";
  /** Custom CSS class names */
  className?: string;
  /** Ref to underlying input */
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Toggle/Switch Component
 * 
 * Usage:
 *   <Toggle label="Enable notifications" />
 *   <Toggle checked onChange={handleChange} description="Turn on alerts" />
 */
export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      label,
      description,
      size = "m",
      className = "",
      disabled = false,
      checked = false,
      ...rest
    },
    ref
  ) => {
    const [isChecked, setIsChecked] = React.useState(checked);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsChecked(e.target.checked);
      if (rest.onChange) {
        rest.onChange(e);
      }
    };

    const baseClass = "toggle";
    const sizeClass = `toggle-${size}`;
    const disabledClass = disabled ? "toggle-disabled" : "";
    const checkedClass = isChecked ? "toggle-checked" : "";

    const containerClasses = [
      baseClass,
      sizeClass,
      disabledClass,
      checkedClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={containerClasses}>
        <label className="toggle-label-wrapper">
          <input
            ref={ref}
            type="checkbox"
            className="toggle-input"
            disabled={disabled}
            checked={isChecked}
            onChange={handleChange}
            {...rest}
          />
          <span className="toggle-switch" />

          {(label || description) && (
            <span className="toggle-label-text">
              {label && <span className="toggle-label">{label}</span>}
              {description && <span className="toggle-description">{description}</span>}
            </span>
          )}
        </label>
      </div>
    );
  }
);

Toggle.displayName = "Toggle";
