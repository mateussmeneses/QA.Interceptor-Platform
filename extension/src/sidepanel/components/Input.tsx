/**
 * QA.Interceptor — Input Component
 * 
 * Reusable input component with multiple variants and sizes
 * Implements Phase FE-1 tasks: INP-001 (Text Input Base)
 * Foundation for INP-002 through INP-008
 */

import React from "react";

export type InputVariant = "default" | "search" | "error" | "success";
export type InputSize = "sm" | "m" | "lg";
export type InputType = "text" | "email" | "password" | "search" | "number" | "url" | "tel";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Visual style variant */
  variant?: InputVariant;
  /** Input size */
  size?: InputSize;
  /** Input type (text, email, password, etc) */
  type?: InputType;
  /** Placeholder text */
  placeholder?: string;
  /** Show clear button (X) */
  isClearable?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;
  /** Left icon/element */
  leftIcon?: React.ReactNode;
  /** Right icon/element */
  rightIcon?: React.ReactNode;
  /** Error message to display below input */
  errorMessage?: string;
  /** Helper/hint text below input */
  helperText?: string;
  /** Label text */
  label?: string;
  /** Show label as required */
  isRequired?: boolean;
  /** Custom CSS class names */
  className?: string;
  /** Ref to input element */
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Input Component
 * 
 * Usage:
 *   <Input placeholder="Enter text" />
 *   <Input type="email" label="Email Address" isRequired />
 *   <Input variant="error" errorMessage="This field is required" />
 *   <Input isClearable onClear={() => {}} />
 *   <Input leftIcon={<SearchIcon />} placeholder="Search..." />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id: providedId,
      variant = "default",
      size = "m",
      type = "text",
      placeholder = "",
      isClearable = false,
      onClear,
      leftIcon,
      rightIcon,
      errorMessage,
      helperText,
      label,
      isRequired = false,
      disabled = false,
      className = "",
      value: controlledValue,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      "aria-describedby": ariaDescribedBy,
      ...rest
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const generatedId = React.useId();
    const inputId = providedId ?? generatedId;
    const isControlled = controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(defaultValue?.toString() || "");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const value = isControlled ? controlledValue?.toString() ?? "" : uncontrolledValue;
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

    const baseClass = "input-field";
    const variantClass = `input-${variant}`;
    const sizeClass = `input-${size}`;
    const disabledClass = disabled ? "input-disabled" : "";
    const focusedClass = isFocused ? "input-focused" : "";
    const filledClass = value ? "input-filled" : "";
    const errorClass = errorMessage ? "input-error" : "";

    const classes = [
      baseClass,
      variantClass,
      sizeClass,
      disabledClass,
      focusedClass,
      filledClass,
      errorClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setUncontrolledValue(e.target.value);
      }

      if (onChange) {
        onChange(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (onFocus) {
        onFocus(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (onBlur) {
        onBlur(e);
      }
    };

    const handleClear = () => {
      if (!isControlled) {
        setUncontrolledValue("");
      }

      if (isControlled && inputRef.current) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value"
        )?.set;

        valueSetter?.call(inputRef.current, "");
        inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }

      onClear?.();
      inputRef.current?.focus();
    };

    return (
      <div className="input-wrapper">
        {label && (
          <label className="input-label" htmlFor={inputId}>
            {label}
            {isRequired && <span className="input-required">*</span>}
          </label>
        )}

        <div className="input-container">
          {leftIcon && <span className="input-icon-left">{leftIcon}</span>}

          <input
            ref={setRefs}
            id={inputId}
            className={classes}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={describedBy}
            {...rest}
          />

          {(isClearable || rightIcon) && (
            <div className="input-icon-right">
              {isClearable && value && (
                <button
                  type="button"
                  className="input-clear-btn"
                  onClick={handleClear}
                  aria-label="Clear input"
                  tabIndex={-1}
                >
                  ✕
                </button>
              )}
              {rightIcon && !isClearable && <span>{rightIcon}</span>}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="input-error-message" id={errorMessageId} role="alert">
            {errorMessage}
          </div>
        )}

        {helperText && !errorMessage && (
          <div className="input-helper-text" id={helperTextId}>{helperText}</div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

/**
 * Preset input variants for common use cases
 */

interface EmailInputProps extends Omit<InputProps, "type"> {}
export const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  (props, ref) => <Input ref={ref} type="email" {...props} />
);
EmailInput.displayName = "EmailInput";

interface PasswordInputProps extends Omit<InputProps, "type"> {}
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => <Input ref={ref} type="password" {...props} />
);
PasswordInput.displayName = "PasswordInput";

interface SearchInputProps extends Omit<InputProps, "type"> {}
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (props, ref) => (
    <Input 
      ref={ref} 
      type="search" 
      variant="search"
      isClearable
      {...props} 
    />
  )
);
SearchInput.displayName = "SearchInput";

interface NumberInputProps extends Omit<InputProps, "type"> {}
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (props, ref) => <Input ref={ref} type="number" {...props} />
);
NumberInput.displayName = "NumberInput";
