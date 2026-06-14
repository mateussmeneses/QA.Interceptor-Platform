/**
 * QA.Interceptor — Number Stepper Input Component
 *
 * Numeric input with increment/decrement controls.
 * Implements Phase FE-1 task: INP-007 (Number Input with Stepper)
 */

import React from "react";

export type NumberStepperSize = "sm" | "m" | "lg";
export type NumberStepperVariant = "default" | "error" | "success";

export interface NumberStepperInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "value" | "defaultValue" | "onChange"> {
  size?: NumberStepperSize;
  variant?: NumberStepperVariant;
  value?: number;
  defaultValue?: number;
  step?: number;
  min?: number;
  max?: number;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isRequired?: boolean;
  onChange?: (value: number | undefined, event: React.ChangeEvent<HTMLInputElement>) => void;
}

const clampValue = (value: number, min?: number, max?: number): number => {
  let next = value;

  if (min !== undefined && next < min) {
    next = min;
  }

  if (max !== undefined && next > max) {
    next = max;
  }

  return next;
};

const parseNumericValue = (raw: string): number | undefined => {
  if (raw.trim() === "") {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const NumberStepperInput = React.forwardRef<HTMLInputElement, NumberStepperInputProps>(
  (
    {
      id: providedId,
      size = "m",
      variant = "default",
      value: controlledValue,
      defaultValue,
      step = 1,
      min,
      max,
      label,
      helperText,
      errorMessage,
      isRequired = false,
      className = "",
      disabled = false,
      onChange,
      "aria-describedby": ariaDescribedBy,
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = providedId ?? generatedId;
    const isControlled = controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<number | undefined>(defaultValue);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const currentValue = isControlled ? controlledValue : uncontrolledValue;
    const displayValue = currentValue ?? "";
    const errorMessageId = errorMessage ? `${inputId}-error` : undefined;
    const helperTextId = helperText && !errorMessage ? `${inputId}-helper` : undefined;
    const describedBy = [ariaDescribedBy, errorMessageId, helperTextId].filter(Boolean).join(" ") || undefined;

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;

        if (typeof ref === "function") {
          ref(node);
          return;
        }

        if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const emitValue = React.useCallback(
      (next: number | undefined) => {
        if (!isControlled) {
          setUncontrolledValue(next);
        }

        if (!onChange || !inputRef.current) {
          return;
        }

        const valueAsText = next === undefined ? "" : String(next);
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value"
        )?.set;

        valueSetter?.call(inputRef.current, valueAsText);
        const event = new Event("input", { bubbles: true });
        inputRef.current.dispatchEvent(event);
      },
      [isControlled, onChange]
    );

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseNumericValue(event.target.value);
      const clamped = parsed === undefined ? undefined : clampValue(parsed, min, max);

      if (!isControlled) {
        setUncontrolledValue(clamped);
      }

      onChange?.(clamped, event);
    };

    const stepBy = (delta: number) => {
      const baseValue = currentValue ?? min ?? 0;
      const next = clampValue(baseValue + delta, min, max);

      emitValue(next);
      if (inputRef.current) {
        const syntheticEvent = {
          target: inputRef.current,
          currentTarget: inputRef.current,
        } as React.ChangeEvent<HTMLInputElement>;
        onChange?.(next, syntheticEvent);
        inputRef.current.focus();
      }
    };

    const canDecrement = !disabled && (min === undefined || (currentValue ?? min) > min);
    const canIncrement = !disabled && (max === undefined || (currentValue ?? max) < max);

    const classes = [
      "number-stepper-input",
      `number-stepper-${size}`,
      `number-stepper-${variant}`,
      disabled ? "number-stepper-disabled" : "",
      errorMessage ? "number-stepper-error" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="number-stepper-wrapper">
        {label && (
          <label className="number-stepper-label" htmlFor={inputId}>
            {label}
            {isRequired && <span className="number-stepper-required">*</span>}
          </label>
        )}

        <div className="number-stepper-container">
          <button
            type="button"
            className="number-stepper-btn number-stepper-btn-decrement"
            onClick={() => stepBy(-step)}
            disabled={!canDecrement}
            aria-label="Decrease value"
          >
            -
          </button>

          <input
            {...rest}
            ref={setRefs}
            id={inputId}
            type="number"
            className={classes}
            value={displayValue}
            onChange={handleInputChange}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={describedBy}
          />

          <button
            type="button"
            className="number-stepper-btn number-stepper-btn-increment"
            onClick={() => stepBy(step)}
            disabled={!canIncrement}
            aria-label="Increase value"
          >
            +
          </button>
        </div>

        {errorMessage ? (
          <div className="number-stepper-error-message" id={errorMessageId} role="alert">
            {errorMessage}
          </div>
        ) : helperText ? (
          <div className="number-stepper-helper-text" id={helperTextId}>
            {helperText}
          </div>
        ) : null}
      </div>
    );
  }
);

NumberStepperInput.displayName = "NumberStepperInput";