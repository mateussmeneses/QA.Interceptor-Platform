/**
 * QA.Interceptor — Select Dropdown Component
 *
 * Custom select/dropdown with keyboard navigation, grouping, search and multi-select.
 * Implements Phase FE-1 task: INP-003 (Select / dropdown)
 */

import React from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  keywords?: string[];
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectDropdownProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options?: SelectOption[];
  groups?: SelectGroup[];
  value?: string | string[];
  defaultValue?: string | string[];
  multiple?: boolean;
  searchable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isRequired?: boolean;
  onChange?: (value: string | string[] | undefined) => void;
}

interface FlattenedOption {
  option: SelectOption;
  groupLabel?: string;
}

const normalizeValue = (
  value: string | string[] | undefined,
  multiple: boolean
): string[] => {
  if (value === undefined) {
    return [];
  }

  if (multiple) {
    return Array.isArray(value) ? value : [value];
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? [value[0]] : [];
  }

  return [value];
};

const defaultFilter = (option: SelectOption, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const keywordText = (option.keywords ?? []).join(" ").toLowerCase();
  const haystack = `${option.label} ${option.value} ${keywordText}`.toLowerCase();
  return haystack.includes(normalizedQuery);
};

export const SelectDropdown = React.forwardRef<HTMLDivElement, SelectDropdownProps>(
  (
    {
      id: providedId,
      options = [],
      groups = [],
      value: controlledValue,
      defaultValue,
      multiple = false,
      searchable = true,
      placeholder = "Select...",
      disabled = false,
      clearable = true,
      label,
      helperText,
      errorMessage,
      isRequired = false,
      onChange,
      className = "",
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = providedId ?? generatedId;
    const isControlled = controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string | string[] | undefined>(
      defaultValue
    );
    const [isOpen, setIsOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const searchRef = React.useRef<HTMLInputElement>(null);

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;

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

    const sourceValue = isControlled ? controlledValue : uncontrolledValue;
    const selectedValues = normalizeValue(sourceValue, multiple);

    const flattenedOptions = React.useMemo<FlattenedOption[]>(() => {
      const result: FlattenedOption[] = options.map((option) => ({ option }));

      groups.forEach((group) => {
        group.options.forEach((option) => {
          result.push({ option, groupLabel: group.label });
        });
      });

      return result;
    }, [groups, options]);

    const filteredOptions = React.useMemo(() => {
      return flattenedOptions.filter((entry) => defaultFilter(entry.option, query));
    }, [flattenedOptions, query]);

    const selectedLabel = React.useMemo(() => {
      if (selectedValues.length === 0) {
        return "";
      }

      if (multiple) {
        if (selectedValues.length === 1) {
          return flattenedOptions.find((entry) => entry.option.value === selectedValues[0])?.option.label ?? "";
        }
        return `${selectedValues.length} selected`;
      }

      return flattenedOptions.find((entry) => entry.option.value === selectedValues[0])?.option.label ?? "";
    }, [flattenedOptions, multiple, selectedValues]);

    const emitChange = (next: string[] | undefined) => {
      const normalized = multiple ? next : next?.[0];

      if (!isControlled) {
        setUncontrolledValue(normalized);
      }

      onChange?.(normalized);
    };

    const toggleOption = (option: SelectOption) => {
      if (option.disabled) {
        return;
      }

      if (multiple) {
        const hasValue = selectedValues.includes(option.value);
        const next = hasValue
          ? selectedValues.filter((value) => value !== option.value)
          : [...selectedValues, option.value];
        emitChange(next.length > 0 ? next : undefined);
        return;
      }

      const next = selectedValues[0] === option.value ? undefined : [option.value];
      emitChange(next);
      setIsOpen(false);
    };

    const moveHighlight = (direction: 1 | -1) => {
      if (filteredOptions.length === 0) {
        setHighlightedIndex(-1);
        return;
      }

      let nextIndex = highlightedIndex;
      for (let tries = 0; tries < filteredOptions.length; tries += 1) {
        nextIndex = (nextIndex + direction + filteredOptions.length) % filteredOptions.length;
        if (!filteredOptions[nextIndex].option.disabled) {
          setHighlightedIndex(nextIndex);
          return;
        }
      }
    };

    const closeDropdown = React.useCallback(() => {
      setIsOpen(false);
      setQuery("");
      setHighlightedIndex(-1);
    }, []);

    React.useEffect(() => {
      const onOutsidePointer = (event: MouseEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) {
          closeDropdown();
        }
      };

      document.addEventListener("mousedown", onOutsidePointer);
      return () => {
        document.removeEventListener("mousedown", onOutsidePointer);
      };
    }, [closeDropdown]);

    React.useEffect(() => {
      if (!isOpen) {
        return;
      }

      if (searchable) {
        searchRef.current?.focus();
      } else {
        listRef.current?.focus();
      }
    }, [isOpen, searchable]);

    React.useEffect(() => {
      if (!isOpen) {
        return;
      }

      const firstEnabled = filteredOptions.findIndex((entry) => !entry.option.disabled);
      setHighlightedIndex(firstEnabled);
    }, [filteredOptions, isOpen]);

    const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setIsOpen(true);
      }

      if (event.key === "Backspace" && clearable && selectedValues.length > 0) {
        event.preventDefault();
        emitChange(undefined);
      }
    };

    const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDropdown();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHighlight(1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHighlight(-1);
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && highlightedIndex >= 0) {
        event.preventDefault();
        const highlighted = filteredOptions[highlightedIndex];
        if (highlighted) {
          toggleOption(highlighted.option);
        }
      }
    };

    const helperTextId = helperText && !errorMessage ? `${selectId}-helper` : undefined;
    const errorMessageId = errorMessage ? `${selectId}-error` : undefined;
    const describedBy = [helperTextId, errorMessageId].filter(Boolean).join(" ") || undefined;

    const classes = [
      "select-dropdown",
      isOpen ? "select-dropdown-open" : "",
      disabled ? "select-dropdown-disabled" : "",
      errorMessage ? "select-dropdown-error" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div {...rest} ref={setRefs} id={selectId} className={classes}>
        {label && (
          <label className="select-dropdown-label">
            {label}
            {isRequired && <span className="select-dropdown-required">*</span>}
          </label>
        )}

        <div className="select-dropdown-control">
          <button
            type="button"
            className="select-dropdown-trigger"
            onClick={() => !disabled && setIsOpen((open) => !open)}
            onKeyDown={handleTriggerKeyDown}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={`${selectId}-listbox`}
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={describedBy}
            disabled={disabled}
          >
            <span className={selectedLabel ? "select-dropdown-value" : "select-dropdown-placeholder"}>
              {selectedLabel || placeholder}
            </span>
            <span className="select-dropdown-chevron" aria-hidden="true">▾</span>
          </button>

          {clearable && selectedValues.length > 0 && !disabled && (
            <button
              type="button"
              className="select-dropdown-clear"
              onClick={() => emitChange(undefined)}
              aria-label="Clear selection"
            >
              ✕
            </button>
          )}
        </div>

        {isOpen && (
          <div className="select-dropdown-panel">
            {searchable && (
              <div className="select-dropdown-search-wrap">
                <input
                  ref={searchRef}
                  type="text"
                  className="select-dropdown-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter options..."
                  aria-label="Filter options"
                />
              </div>
            )}

            <div
              id={`${selectId}-listbox`}
              ref={listRef}
              className="select-dropdown-list"
              role="listbox"
              aria-multiselectable={multiple || undefined}
              tabIndex={-1}
              onKeyDown={handleListKeyDown}
            >
              {filteredOptions.length === 0 && (
                <div className="select-dropdown-empty">No options found</div>
              )}

              {filteredOptions.map((entry, index) => {
                const { option } = entry;
                const selected = selectedValues.includes(option.value);
                const highlighted = index === highlightedIndex;

                return (
                  <React.Fragment key={`${entry.groupLabel ?? "ungrouped"}-${option.value}`}>
                    {entry.groupLabel &&
                      (index === 0 || filteredOptions[index - 1].groupLabel !== entry.groupLabel) && (
                        <div className="select-dropdown-group">{entry.groupLabel}</div>
                      )}

                    <button
                      type="button"
                      className={[
                        "select-dropdown-option",
                        selected ? "select-dropdown-option-selected" : "",
                        highlighted ? "select-dropdown-option-highlighted" : "",
                        option.disabled ? "select-dropdown-option-disabled" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      role="option"
                      aria-selected={selected}
                      disabled={option.disabled}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => toggleOption(option)}
                    >
                      {multiple && (
                        <span className="select-dropdown-check" aria-hidden="true">
                          {selected ? "✓" : ""}
                        </span>
                      )}
                      <span className="select-dropdown-option-label">{option.label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {errorMessage ? (
          <div className="select-dropdown-error-message" id={errorMessageId} role="alert">
            {errorMessage}
          </div>
        ) : helperText ? (
          <div className="select-dropdown-helper-text" id={helperTextId}>
            {helperText}
          </div>
        ) : null}
      </div>
    );
  }
);

SelectDropdown.displayName = "SelectDropdown";