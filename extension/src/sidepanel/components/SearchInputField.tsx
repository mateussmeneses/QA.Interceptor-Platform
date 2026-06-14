/**
 * QA.Interceptor — Search Input Field Component
 *
 * Search-focused input with debounce and loading state.
 * Implements Phase FE-1 task: INP-002 (Search Input)
 */

import React from "react";
import { Input, type InputProps } from "./Input";

export interface SearchInputFieldProps
  extends Omit<InputProps, "type" | "variant" | "leftIcon" | "onChange"> {
  debounceMs?: number;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="search-input-icon">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="16.2" y1="16.2" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const SearchSpinner = () => <span className="search-input-spinner" aria-hidden="true" />;

export const SearchInputField = React.forwardRef<HTMLInputElement, SearchInputFieldProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      debounceMs = 250,
      onSearch,
      isLoading = false,
      onChange,
      placeholder = "Search...",
      isClearable = true,
      rightIcon,
      ...rest
    },
    ref
  ) => {
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = React.useState<string>(defaultValue?.toString() ?? "");
    const value = isControlled ? controlledValue?.toString() ?? "" : internalValue;

    React.useEffect(() => {
      if (!onSearch) {
        return;
      }

      const timer = window.setTimeout(() => {
        onSearch(value.trim());
      }, debounceMs);

      return () => {
        window.clearTimeout(timer);
      };
    }, [debounceMs, onSearch, value]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(event.target.value);
      }

      onChange?.(event.target.value, event);
    };

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue("");
      }

      onSearch?.("");
    };

    return (
      <Input
        {...rest}
        ref={ref}
        type="search"
        variant="search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onClear={handleClear}
        isClearable={isClearable}
        leftIcon={<SearchIcon />}
        rightIcon={isLoading ? <SearchSpinner /> : rightIcon}
      />
    );
  }
);

SearchInputField.displayName = "SearchInputField";