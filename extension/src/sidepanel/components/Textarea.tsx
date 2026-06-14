/**
 * QA.Interceptor — Textarea Component
 *
 * Reusable multi-line text input for forms and editors.
 * Implements Phase FE-1 task: INP-008 (Textarea)
 */

import React from "react";

export type TextareaVariant = "default" | "error" | "success";
export type TextareaSize = "sm" | "m" | "lg";

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  variant?: TextareaVariant;
  size?: TextareaSize;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isRequired?: boolean;
  autoResize?: boolean;
  showCharacterCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id: providedId,
      variant = "default",
      size = "m",
      label,
      helperText,
      errorMessage,
      isRequired = false,
      autoResize = false,
      showCharacterCount = false,
      className = "",
      disabled = false,
      value: controlledValue,
      defaultValue,
      onChange,
      "aria-describedby": ariaDescribedBy,
      maxLength,
      rows = 4,
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = providedId ?? generatedId;
    const isControlled = controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(defaultValue?.toString() || "");
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const value = isControlled ? controlledValue?.toString() ?? "" : uncontrolledValue;
    const errorMessageId = errorMessage ? `${textareaId}-error` : undefined;
    const helperTextId = helperText && !errorMessage ? `${textareaId}-helper` : undefined;
    const characterCountId = showCharacterCount ? `${textareaId}-count` : undefined;
    const describedBy = [ariaDescribedBy, errorMessageId, helperTextId, characterCountId]
      .filter(Boolean)
      .join(" ") || undefined;

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;

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

    const resizeToContent = React.useCallback(() => {
      if (!autoResize || !textareaRef.current) {
        return;
      }

      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }, [autoResize]);

    React.useEffect(() => {
      resizeToContent();
    }, [resizeToContent, value]);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) {
        setUncontrolledValue(event.target.value);
      }

      onChange?.(event);
    };

    const classes = [
      "textarea-field",
      `textarea-${variant}`,
      `textarea-${size}`,
      disabled ? "textarea-disabled" : "",
      autoResize ? "textarea-auto-resize" : "",
      errorMessage ? "textarea-error" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="textarea-wrapper">
        {label && (
          <label className="textarea-label" htmlFor={textareaId}>
            {label}
            {isRequired && <span className="textarea-required">*</span>}
          </label>
        )}

        <textarea
          {...rest}
          ref={setRefs}
          id={textareaId}
          className={classes}
          disabled={disabled}
          rows={rows}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={describedBy}
        />

        <div className="textarea-footer">
          {errorMessage ? (
            <div className="textarea-error-message" id={errorMessageId} role="alert">
              {errorMessage}
            </div>
          ) : helperText ? (
            <div className="textarea-helper-text" id={helperTextId}>
              {helperText}
            </div>
          ) : (
            <span />
          )}

          {showCharacterCount && (
            <div className="textarea-character-count" id={characterCountId}>
              {value.length}{maxLength ? `/${maxLength}` : ""}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";