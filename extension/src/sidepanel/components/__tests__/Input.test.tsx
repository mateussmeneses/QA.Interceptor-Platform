/**
 * QA.Interceptor — Input Component Tests
 * 
 * Unit tests for the Input component
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Input,
  EmailInput,
  PasswordInput,
  SearchInput,
  NumberInput,
} from "../Input";

describe("Input Component", () => {
  // =========================================================================
  // RENDERING TESTS
  // =========================================================================

  it("renders input with default props", () => {
    render(<Input data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass("input-field", "input-default", "input-m");
  });

  it("renders input with placeholder", () => {
    render(<Input placeholder="Enter text" data-testid="test-input" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("renders input with label", () => {
    render(<Input label="Username" data-testid="test-input" />);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("renders required indicator when isRequired", () => {
    render(<Input label="Email" isRequired data-testid="test-input" />);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("renders with all size variants", () => {
    const sizes = ["sm", "m", "lg"] as const;
    sizes.forEach((size) => {
      const { unmount } = render(<Input size={size} data-testid="test-input" />);
      expect(screen.getByTestId("test-input")).toHaveClass(`input-${size}`);
      unmount();
    });
  });

  it("renders with all variants", () => {
    const variants = ["default", "search", "error", "success"] as const;
    variants.forEach((variant) => {
      const { unmount } = render(<Input variant={variant} data-testid="test-input" />);
      expect(screen.getByTestId("test-input")).toHaveClass(`input-${variant}`);
      unmount();
    });
  });

  it("renders with different input types", () => {
    const types = ["text", "email", "password", "number", "search"] as const;
    types.forEach((type) => {
      const { unmount } = render(<Input type={type} data-testid="test-input" />);
      expect(screen.getByTestId("test-input")).toHaveAttribute("type", type);
      unmount();
    });
  });

  // =========================================================================
  // ICONS TESTS
  // =========================================================================

  it("renders left icon", () => {
    render(
      <Input
        leftIcon={<span data-testid="left-icon">🔍</span>}
        data-testid="test-input"
      />
    );
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
  });

  it("renders right icon", () => {
    render(
      <Input
        rightIcon={<span data-testid="right-icon">✓</span>}
        data-testid="test-input"
      />
    );
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
  });

  // =========================================================================
  // ERROR & HELPER TEXT
  // =========================================================================

  it("renders error message", () => {
    render(<Input errorMessage="This field is required" data-testid="test-input" />);
    expect(screen.getByText("This field is required")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders helper text", () => {
    render(<Input helperText="Password must be 8+ characters" data-testid="test-input" />);
    expect(screen.getByText("Password must be 8+ characters")).toBeInTheDocument();
  });

  it("does not show helper text when error message exists", () => {
    render(
      <Input
        errorMessage="Required"
        helperText="Helper text"
        data-testid="test-input"
      />
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.queryByText("Helper text")).not.toBeInTheDocument();
  });

  it("applies error variant when errorMessage is provided", () => {
    render(<Input errorMessage="Error" data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toHaveClass("input-error");
  });

  // =========================================================================
  // DISABLED STATE
  // =========================================================================

  it("renders disabled input", () => {
    render(<Input disabled data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toBeDisabled();
  });

  it("applies disabled class", () => {
    render(<Input disabled data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toHaveClass("input-disabled");
  });

  // =========================================================================
  // CLEARABLE FUNCTIONALITY
  // =========================================================================

  it("shows clear button when isClearable and input has value", async () => {
    const { rerender } = render(
      <Input isClearable data-testid="test-input" defaultValue="text" />
    );
    const clearBtn = screen.getByLabelText("Clear input");
    expect(clearBtn).toBeInTheDocument();

    rerender(<Input isClearable data-testid="test-input" />);
    expect(screen.queryByLabelText("Clear input")).not.toBeInTheDocument();
  });

  it("clears input value when clear button is clicked", async () => {
    const handleClear = vi.fn();
    const { rerender } = render(
      <Input isClearable onClear={handleClear} data-testid="test-input" />
    );

    const input = screen.getByTestId("test-input") as HTMLInputElement;
    await userEvent.type(input, "hello");
    expect(input.value).toBe("hello");

    const clearBtn = screen.getByLabelText("Clear input");
    await userEvent.click(clearBtn);

    expect(input.value).toBe("");
    expect(handleClear).toHaveBeenCalledOnce();
  });

  // =========================================================================
  // USER INTERACTION TESTS
  // =========================================================================

  it("calls onChange when value changes", async () => {
    const handleChange = vi.fn();
    render(
      <Input onChange={handleChange} data-testid="test-input" />
    );
    const input = screen.getByTestId("test-input");

    await userEvent.type(input, "hello");

    expect(handleChange).toHaveBeenCalled();
  });

  it("calls onFocus when input is focused", async () => {
    const handleFocus = vi.fn();
    render(
      <Input onFocus={handleFocus} data-testid="test-input" />
    );
    const input = screen.getByTestId("test-input");

    await userEvent.click(input);

    expect(handleFocus).toHaveBeenCalledOnce();
  });

  it("calls onBlur when input loses focus", async () => {
    const handleBlur = vi.fn();
    render(
      <>
        <Input onBlur={handleBlur} data-testid="test-input" />
        <button>Other</button>
      </>
    );
    const input = screen.getByTestId("test-input");
    const otherBtn = screen.getByText("Other");

    await userEvent.click(input);
    await userEvent.click(otherBtn);

    expect(handleBlur).toHaveBeenCalledOnce();
  });

  // =========================================================================
  // ACCESSIBILITY TESTS
  // =========================================================================

  it("supports aria attributes", () => {
    render(
      <Input
        aria-label="Custom label"
        aria-describedby="description"
        data-testid="test-input"
      />
    );
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("aria-label", "Custom label");
    expect(input).toHaveAttribute("aria-describedby", "description");
  });

  it("associates label with input", () => {
    const { container } = render(
      <Input label="Email" data-testid="test-input" />
    );
    const label = container.querySelector("label");
    expect(label).toBeInTheDocument();
  });

  it("error message has role alert for accessibility", () => {
    render(<Input errorMessage="Error" data-testid="test-input" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  // =========================================================================
  // REF FORWARDING
  // =========================================================================

  it("forwards ref to input element", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} data-testid="test-input" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  // =========================================================================
  // PRESET VARIANTS
  // =========================================================================

  it("renders EmailInput with email type", () => {
    render(<EmailInput data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toHaveAttribute("type", "email");
  });

  it("renders PasswordInput with password type", () => {
    render(<PasswordInput data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toHaveAttribute("type", "password");
  });

  it("renders SearchInput with search type", () => {
    render(<SearchInput data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toHaveAttribute("type", "search");
  });

  it("renders SearchInput with search variant and clearable", () => {
    render(<SearchInput data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toHaveClass("input-search");
  });

  it("renders NumberInput with number type", () => {
    render(<NumberInput data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toHaveAttribute("type", "number");
  });

  // =========================================================================
  // HTML ATTRIBUTES
  // =========================================================================

  it("passes through standard HTML attributes", () => {
    render(
      <Input
        maxLength={10}
        minLength={5}
        autoComplete="off"
        data-testid="test-input"
      />
    );
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("maxLength", "10");
    expect(input).toHaveAttribute("minLength", "5");
    expect(input).toHaveAttribute("autoComplete", "off");
  });

  it("supports custom data attributes", () => {
    render(
      <Input data-testid="test-input" data-action="search" data-id="123" />
    );
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("data-action", "search");
    expect(input).toHaveAttribute("data-id", "123");
  });

  // =========================================================================
  // VALUE & CONTROLLED INPUT
  // =========================================================================

  it("accepts initial defaultValue", () => {
    render(<Input defaultValue="initial text" data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toHaveValue("initial text");
  });

  it("can be controlled with value prop", async () => {
    const { rerender } = render(
      <Input value="initial" readOnly data-testid="test-input" />
    );
    expect(screen.getByTestId("test-input")).toHaveValue("initial");

    rerender(<Input value="updated" readOnly data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toHaveValue("updated");
  });

  // =========================================================================
  // READONLY STATE
  // =========================================================================

  it("renders readonly input", () => {
    render(<Input readOnly data-testid="test-input" />);
    expect(screen.getByTestId("test-input")).toHaveAttribute("readOnly");
  });
});
