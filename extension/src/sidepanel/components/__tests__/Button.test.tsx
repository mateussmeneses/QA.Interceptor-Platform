/**
 * QA.Interceptor — Button Component Tests
 * 
 * Unit tests for the Button component
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, PrimaryButton, SecondaryButton, DangerButton } from "../Button";

describe("Button Component", () => {
  // =========================================================================
  // RENDERING TESTS
  // =========================================================================

  it("renders button with default props", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("btn", "btn-primary", "btn-m");
  });

  it("renders button with custom variant", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("btn-secondary");
  });

  it("renders button with custom size", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("btn-lg");
  });

  it("renders button with custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("renders all button size variants", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-sm");

    rerender(<Button size="m">Medium</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-m");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-lg");
  });

  it("renders all button variants", () => {
    const variants = ["primary", "secondary", "ghost", "danger", "compact"];
    const { rerender } = render(
      <Button variant="primary" as={any}>
        Primary
      </Button>
    );

    variants.forEach((variant) => {
      rerender(
        <Button variant={variant as any}>
          {variant}
        </Button>
      );
      expect(screen.getByRole("button")).toHaveClass(`btn-${variant}`);
    });
  });

  // =========================================================================
  // DISABLED STATE TESTS
  // =========================================================================

  it("renders disabled button", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("applies disabled class when disabled", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("btn-disabled");
  });

  it("disables button when loading", () => {
    render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  // =========================================================================
  // LOADING STATE TESTS
  // =========================================================================

  it("renders loading spinner when isLoading is true", () => {
    render(<Button isLoading>Saving</Button>);
    const spinner = screen.getByRole("button").querySelector(".btn-spinner");
    expect(spinner).toBeInTheDocument();
  });

  it("shows text alongside loading spinner", () => {
    render(<Button isLoading>Saving</Button>);
    expect(screen.getByText("Saving")).toBeInTheDocument();
  });

  // =========================================================================
  // CLICK HANDLER TESTS
  // =========================================================================

  it("calls onClick handler when clicked", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    const button = screen.getByRole("button");

    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", async () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );
    const button = screen.getByRole("button");

    await userEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("does not call onClick when loading", async () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} isLoading>
        Loading
      </Button>
    );
    const button = screen.getByRole("button");

    await userEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  // =========================================================================
  // ACCESSIBILITY TESTS
  // =========================================================================

  it("has type='button' by default", () => {
    render(<Button>Button</Button>);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.type).toBe("button");
  });

  it("supports aria attributes", () => {
    render(
      <Button aria-label="Custom label" aria-describedby="description">
        Button
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Custom label");
    expect(button).toHaveAttribute("aria-describedby", "description");
  });

  it("hides spinner from accessibility tree", () => {
    render(<Button isLoading>Loading</Button>);
    const spinner = screen.getByRole("button").querySelector(".btn-spinner");
    expect(spinner).toHaveAttribute("aria-hidden", "true");
  });

  // =========================================================================
  // REF FORWARDING TESTS
  // =========================================================================

  it("forwards ref to button element", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref test</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  // =========================================================================
  // PRESET VARIANTS TESTS
  // =========================================================================

  it("renders PrimaryButton with correct variant", () => {
    render(<PrimaryButton>Primary</PrimaryButton>);
    expect(screen.getByRole("button")).toHaveClass("btn-primary");
  });

  it("renders SecondaryButton with correct variant", () => {
    render(<SecondaryButton>Secondary</SecondaryButton>);
    expect(screen.getByRole("button")).toHaveClass("btn-secondary");
  });

  it("renders DangerButton with correct variant", () => {
    render(<DangerButton>Delete</DangerButton>);
    expect(screen.getByRole("button")).toHaveClass("btn-danger");
  });

  // =========================================================================
  // HTML ATTRIBUTES TESTS
  // =========================================================================

  it("passes through standard HTML attributes", () => {
    render(
      <Button data-testid="custom-button" title="Tooltip">
        Button
      </Button>
    );
    const button = screen.getByTestId("custom-button");
    expect(button).toHaveAttribute("title", "Tooltip");
  });

  it("supports custom data attributes", () => {
    render(
      <Button data-action="confirm" data-value="123">
        Button
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-action", "confirm");
    expect(button).toHaveAttribute("data-value", "123");
  });

  // =========================================================================
  // CONTENT TESTS
  // =========================================================================

  it("renders button with text content", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("renders button with complex content", () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>
    );
    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });
});
