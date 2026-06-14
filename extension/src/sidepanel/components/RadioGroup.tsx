/**
 * QA.Interceptor — Radio Group Component
 *
 * Grouped single-choice input for forms.
 * Implements Phase FE-1 task: INP-006 (Radio Button Group)
 */

import React from "react";

export interface RadioOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps
  extends Omit<React.HTMLAttributes<HTMLFieldSetElement>, "onChange"> {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  orientation?: "vertical" | "horizontal";
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const RadioGroup = React.forwardRef<HTMLFieldSetElement, RadioGroupProps>(
  (
    {
      name,
      options,
      value: controlledValue,
      defaultValue,
      label,
      helperText,
      errorMessage,
      orientation = "vertical",
      className = "",
      disabled = false,
      onChange,
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const groupId = rest.id ?? generatedId;
    const isControlled = controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
    const selectedValue = isControlled ? controlledValue ?? "" : uncontrolledValue;
    const helperTextId = helperText && !errorMessage ? `${groupId}-helper` : undefined;
    const errorMessageId = errorMessage ? `${groupId}-error` : undefined;
    const describedBy = [helperTextId, errorMessageId].filter(Boolean).join(" ") || undefined;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setUncontrolledValue(event.target.value);
      }

      onChange?.(event.target.value, event);
    };

    const classes = [
      "radio-group",
      `radio-group-${orientation}`,
      errorMessage ? "radio-group-error" : "",
      disabled ? "radio-group-disabled" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <fieldset
        {...rest}
        ref={ref}
        id={groupId}
        className={classes}
        disabled={disabled}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={describedBy}
      >
        {label && <legend className="radio-group-label">{label}</legend>}

        <div className="radio-group-options">
          {options.map((option) => {
            const optionId = `${groupId}-${option.value}`;

            return (
              <label
                key={option.value}
                className={[
                  "radio-option",
                  option.disabled ? "radio-option-disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                htmlFor={optionId}
              >
                <input
                  id={optionId}
                  className="radio-input"
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={selectedValue === option.value}
                  disabled={disabled || option.disabled}
                  onChange={handleChange}
                />
                <span className="radio-control" aria-hidden="true" />
                <span className="radio-content">
                  <span className="radio-option-label">{option.label}</span>
                  {option.description && (
                    <span className="radio-option-description">{option.description}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>

        {errorMessage ? (
          <div className="radio-group-error-message" id={errorMessageId} role="alert">
            {errorMessage}
          </div>
        ) : helperText ? (
          <div className="radio-group-helper-text" id={helperTextId}>
            {helperText}
          </div>
        ) : null}
      </fieldset>
    );
  }
);

RadioGroup.displayName = "RadioGroup";