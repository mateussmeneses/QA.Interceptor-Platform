/**
 * QA.Interceptor — Checkbox Component
 * 
 * Implements Phase FE-1 task: INP-005 (Checkbox)
 * Multiple choice checkbox with optional indeterminate state
 */

import React from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Checkbox label text */
  label?: string;
  /** Show indeterminate state (partially checked) */
  indeterminate?: boolean;
  /** Custom CSS class names */
  className?: string;
  /** Ref to underlying input */
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Checkbox Component
 * 
 * Usage:
 *   <Checkbox label="I agree" />
 *   <Checkbox checked label="Option selected" />
 *   <Checkbox indeterminate label="Partially selected" />
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      indeterminate = false,
      className = "",
      disabled = false,
      checked = false,
      ...rest
    },
    ref
  ) => {
    const [isChecked, setIsChecked] = React.useState(checked);
    const [isIndeterminate, setIsIndeterminate] = React.useState(indeterminate);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const mergedRef = ref || inputRef;

    // Update indeterminate state on input element
    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = isIndeterminate;
      }
    }, [isIndeterminate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsChecked(e.target.checked);
      setIsIndeterminate(false);
      if (rest.onChange) {
        rest.onChange(e);
      }
    };

    const baseClass = "checkbox";
    const disabledClass = disabled ? "checkbox-disabled" : "";
    const checkedClass = isChecked ? "checkbox-checked" : "";
    const indeterminateClass = isIndeterminate ? "checkbox-indeterminate" : "";

    const containerClasses = [
      baseClass,
      disabledClass,
      checkedClass,
      indeterminateClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={containerClasses}>
        <label className="checkbox-label-wrapper">
          <input
            ref={mergedRef}
            type="checkbox"
            className="checkbox-input"
            disabled={disabled}
            checked={isChecked}
            onChange={handleChange}
            {...rest}
          />
          <span className="checkbox-box" />

          {label && <span className="checkbox-label">{label}</span>}
        </label>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
