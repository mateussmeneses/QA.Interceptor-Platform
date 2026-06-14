# QA.Interceptor — Component Development Patterns

**Purpose**: Standardized patterns for building all frontend components in Phase FE-1+

This document defines the structure, testing patterns, and CSS conventions for creating consistent, high-quality components.

---

## 📐 Component Architecture

Every component follows this structure:

```
components/
├── [ComponentName].tsx          # React component
├── styles/
│   └── [component-name].css    # Component-specific styles
└── __tests__/
    └── [ComponentName].test.tsx # Unit tests
```

---

## 📝 Component File Template

### 1. TypeScript Component (`ComponentName.tsx`)

```typescript
/**
 * QA.Interceptor — [ComponentName] Component
 *
 * Brief description of what this component does.
 * Implements Phase FE-1 task: [TASK-XXX]
 */

import React from "react";

/**
 * Props interface for type safety
 */
export interface [ComponentName]Props
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Brief description of prop */
  variant?: "variant1" | "variant2";

  /** Size of component */
  size?: "sm" | "m" | "lg";

  /** Whether component is disabled */
  disabled?: boolean;

  /** Required content prop */
  children: React.ReactNode;
}

/**
 * [ComponentName] Component
 *
 * Usage:
 *   <[ComponentName]>Content</[ComponentName]>
 *   <[ComponentName] variant="variant1" size="lg">Large variant</[ComponentName]>
 */
export const [ComponentName] = React.forwardRef<
  HTMLDivElement,
  [ComponentName]Props
>(({ variant = "default", size = "m", disabled = false, className = "", ...rest }, ref) => {
  const baseClass = "[component-name]";
  const variantClass = `[component-name]-${variant}`;
  const sizeClass = `[component-name]-${size}`;
  const disabledClass = disabled ? "[component-name]-disabled" : "";

  const classes = [baseClass, variantClass, sizeClass, disabledClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes} {...rest}>
      {/* Component content */}
    </div>
  );
});

[ComponentName].displayName = "[ComponentName]";

/**
 * Preset variants for common use cases
 */

export const [PresetName] = React.forwardRef<
  HTMLDivElement,
  Omit<[ComponentName]Props, "variant">
>((props, ref) => <[ComponentName] ref={ref} variant="preset-value" {...props} />);

[PresetName].displayName = "[PresetName]";
```

### 2. CSS Styles (`styles/[component-name].css`)

```css
/**
 * QA.Interceptor — [ComponentName] Component Styles
 * 
 * Uses design tokens from tokens.css
 * Supports light/dark modes automatically
 */

/* ============================================================================
   BASE STYLES
   ============================================================================ */

.[component-name] {
  /* Base layout & typography */
  display: flex;
  gap: var(--spacing-m);
  padding: var(--padding-m);
  border-radius: var(--radius-lg);
  background-color: var(--surface-bg);
  color: var(--text-primary);
  border: 1px solid var(--border);

  /* Transitions for interactive states */
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

/* Focus states for keyboard navigation */
.[component-name]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-outline-offset);
}

/* ============================================================================
   SIZES
   ============================================================================ */

.[component-name]-sm {
  padding: var(--spacing-sm);
  font-size: var(--font-sm);
}

.[component-name]-m {
  padding: var(--spacing-m);
  font-size: var(--font-base);
}

.[component-name]-lg {
  padding: var(--spacing-l);
  font-size: var(--font-lg);
}

/* ============================================================================
   VARIANTS
   ============================================================================ */

.[component-name]-variant1 {
  background-color: var(--primary);
  color: white;
}

.[component-name]-variant1:hover {
  background-color: var(--primary-hover);
}

.[component-name]-variant2 {
  background-color: var(--surface-alt);
  border-color: var(--border-dark);
}

/* ============================================================================
   DISABLED STATE
   ============================================================================ */

.[component-name]-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

/* ============================================================================
   DARK MODE
   ============================================================================ */

html[data-theme="dark"] .[component-name] {
  background-color: var(--surface-bg);
  color: var(--text-primary);
  border-color: var(--border);
}

/* ============================================================================
   RESPONSIVE
   ============================================================================ */

@media (max-width: 768px) {
  .[component-name] {
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
  }

  .[component-name]-lg {
    padding: var(--spacing-m);
  }
}

/* ============================================================================
   ACCESSIBILITY
   ============================================================================ */

/* High contrast mode support */
@media (prefers-contrast: more) {
  .[component-name] {
    border-width: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .[component-name] {
    transition: none;
  }
}

/* ============================================================================
   PRINT STYLES
   ============================================================================ */

@media print {
  .[component-name] {
    border: 1px solid #000;
    background-color: white;
    color: black;
    box-shadow: none;
  }
}
```

### 3. Unit Tests (`__tests__/[ComponentName].test.tsx`)

```typescript
/**
 * QA.Interceptor — [ComponentName] Component Tests
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { [ComponentName] } from "../[ComponentName]";

describe("[ComponentName]", () => {
  // =========================================================================
  // RENDERING TESTS
  // =========================================================================

  it("renders with default props", () => {
    render(<[ComponentName]>Content<\/[ComponentName]>);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    render(<[ComponentName]>Test<\/[ComponentName]>);
    const element = screen.getByText("Test");
    expect(element).toHaveClass("[component-name]");
  });

  it("renders with variant prop", () => {
    render(<[ComponentName] variant="variant1">Test<\/[ComponentName]>);
    const element = screen.getByText("Test");
    expect(element).toHaveClass("[component-name]-variant1");
  });

  it("renders all size variants", () => {
    const sizes = ["sm", "m", "lg"] as const;
    sizes.forEach((size) => {
      const { unmount } = render(
        <[ComponentName] size={size}>Test<\/[ComponentName]>
      );
      expect(screen.getByText("Test")).toHaveClass(`[component-name]-${size}`);
      unmount();
    });
  });

  // =========================================================================
  // STATE TESTS
  // =========================================================================

  it("renders disabled state", () => {
    render(<[ComponentName] disabled>Content<\/[ComponentName]>);
    const element = screen.getByText("Content");
    expect(element).toHaveClass("[component-name]-disabled");
  });

  // =========================================================================
  // INTERACTION TESTS
  // =========================================================================

  it("handles click events", async () => {
    const handleClick = vi.fn();
    render(
      <[ComponentName] onClick={handleClick}>
        Clickable
      <\/[ComponentName]>
    );
    await userEvent.click(screen.getByText("Clickable"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  // =========================================================================
  // ACCESSIBILITY TESTS
  // =========================================================================

  it("supports custom aria attributes", () => {
    render(
      <[ComponentName] aria-label="Custom label">
        Content
      <\/[ComponentName]>
    );
    expect(screen.getByText("Content")).toHaveAttribute(
      "aria-label",
      "Custom label"
    );
  });

  // =========================================================================
  // REF FORWARDING TESTS
  // =========================================================================

  it("forwards ref to underlying element", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<[ComponentName] ref={ref}>Test<\/[ComponentName]>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  // =========================================================================
  // CONTENT TESTS
  // =========================================================================

  it("renders with complex children", () => {
    render(
      <[ComponentName]>
        <span>First</span>
        <span>Second</span>
      <\/[ComponentName]>
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
```

---

## 🎨 CSS Patterns

### Using Design Tokens

**Always use CSS variables**, never hardcode values:

```css
/* ✅ GOOD */
.component {
  color: var(--text-primary);
  padding: var(--spacing-m);
  border-radius: var(--radius-lg);
  transition: all var(--duration-base) var(--ease-out);
}

/* ❌ BAD */
.component {
  color: #111827;
  padding: 16px;
  border-radius: 8px;
  transition: all 0.3s;
}
```

### Dark Mode Support

Always use the automatic dark mode:

```css
/* ✅ GOOD — Automatic dark mode */
.component {
  background: var(--surface-bg); /* Light: #FFF, Dark: #1F2937 */
  color: var(--text-primary); /* Light: #111827, Dark: #F3F4F6 */
}

/* ❌ BAD — Manual override */
html[data-theme="dark"] .component {
  background-color: #1f2937;
  color: #f3f4f6;
}
```

### Focus States

Always use `:focus-visible` for keyboard navigation:

```css
/* ✅ GOOD — Keyboard focus only */
.component:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-outline-offset);
}

/* ❌ BAD — All focus states */
.component:focus {
  outline: 2px solid blue;
}
```

### Responsive Design

Mobile-first approach with breakpoint variables:

```css
/* ✅ GOOD — Mobile-first */
.component {
  padding: var(--spacing-sm); /* Mobile default */
}

@media (min-width: 768px) {
  .component {
    padding: var(--spacing-m); /* Tablet & up */
  }
}

@media (min-width: 1024px) {
  .component {
    padding: var(--spacing-l); /* Desktop & up */
  }
}

/* ❌ BAD — Desktop-first */
.component {
  padding: 24px;
}

@media (max-width: 768px) {
  .component {
    padding: 8px;
  }
}
```

### Animations

Always use animation variables:

```css
/* ✅ GOOD */
.component {
  transition: background-color var(--duration-fast) var(--ease-out);
}

.component:hover {
  background-color: var(--primary-hover);
}

/* ❌ BAD */
.component {
  transition: background-color 0.3s ease;
}

.component:hover {
  background-color: #1f4791;
}
```

### Accessibility

Always include accessibility considerations:

```css
/* ✅ GOOD */
.component {
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* High contrast support */
  @media (prefers-contrast: more) {
    border-width: 2px;
  }
}

/* ❌ BAD */
.component {
  animation: spin 1s linear infinite;
  /* No reduced motion support */
}
```

---

## 🧪 Testing Patterns

### Component Testing Checklist

For every component, write tests for:

- [ ] Rendering with default props
- [ ] Rendering with all variants
- [ ] Rendering with all sizes
- [ ] Disabled/inactive state
- [ ] Click/interaction handling
- [ ] Keyboard navigation (:focus-visible)
- [ ] ARIA attributes
- [ ] Ref forwarding
- [ ] Complex children/content
- [ ] Dark mode (visual regression)
- [ ] Mobile responsiveness

### Test Data Setup

```typescript
const defaultProps = {
  variant: "primary" as const,
  size: "m" as const,
};

const variants = ["primary", "secondary", "ghost", "danger"] as const;
const sizes = ["sm", "m", "lg"] as const;

describe.each(variants)("Button variant: %s", (variant) => {
  it(`renders ${variant} variant`, () => {
    render(<Button variant={variant}>Test</Button>);
    expect(screen.getByRole("button")).toHaveClass(`btn-${variant}`);
  });
});
```

---

## 📦 Component Lifecycle

### 1. Planning Phase

- Read backlog task (e.g., BTN-001)
- Review design system (colors, sizes, states)
- Check similar components for patterns
- Design prop interface

### 2. Implementation Phase

- Create TypeScript component file
- Create CSS file with all variants
- Create test file with comprehensive tests
- Import CSS in `styles/index.css`

### 3. Integration Phase

- Export component from `components/index.ts`
- Add to feature modules that need it
- Update Storybook (future)
- Merge to main branch

### 4. Refinement Phase (Post-MVP)

- User feedback collection
- A/B testing if needed
- Accessibility audit
- Performance optimization

---

## 🎯 Coding Standards

### TypeScript

- Use strict mode (`noImplicitAny: true`)
- Export interfaces for consumer code
- Use `React.forwardRef` for DOM elements
- Add JSDoc comments to props

### CSS

- Use lowercase class names with hyphens
- Keep specificity low (class level)
- No IDs in component styles
- Follow token-first approach
- Include comments for sections

### Testing

- Test behavior, not implementation
- Use semantic queries (getByRole, getByText)
- Avoid testing CSS directly
- Test accessibility features
- Aim for 80%+ coverage

---

## 🚀 Component Development Workflow

### Step 1: Create Files

```bash
# Component
touch extension/src/sidepanel/components/[ComponentName].tsx

# Styles
touch extension/src/sidepanel/styles/components/[component-name].css

# Tests
touch extension/src/sidepanel/components/__tests__/[ComponentName].test.tsx
```

### Step 2: Implement Component

- Follow TypeScript template
- Add props and variants
- Use React.forwardRef
- Add JSDoc comments

### Step 3: Implement Styles

- Define base styles
- Add all variants
- Add size options
- Add states (hover, active, disabled, focus)
- Add dark mode support
- Add accessibility considerations

### Step 4: Implement Tests

- Test rendering
- Test all variants
- Test interactions
- Test accessibility
- Target 80%+ coverage

### Step 5: Import Styles

```css
/* In extension/src/sidepanel/styles/index.css */
@import "./components/[component-name].css";
```

### Step 6: Export Component

```typescript
// In extension/src/sidepanel/components/index.ts
export { [ComponentName] } from "./[ComponentName]";
```

### Step 7: Commit & Review

```bash
git add extension/src/sidepanel/components/[ComponentName].tsx
git add extension/src/sidepanel/styles/components/[component-name].css
git add extension/src/sidepanel/components/__tests__/[ComponentName].test.tsx
git commit -m "feat: Add [ComponentName] component (Phase FE-1, Task [TASK-XXX])"
```

---

## ✅ Quality Checklist

Before submitting a component:

- [ ] TypeScript compiles without errors
- [ ] All props have types
- [ ] Component has JSDoc comments
- [ ] CSS uses design tokens (no hardcoded values)
- [ ] Dark mode works correctly
- [ ] Focus states visible on tab
- [ ] Tests pass (80%+ coverage)
- [ ] No console warnings
- [ ] Follows naming conventions
- [ ] Documented in Storybook (future)

---

## 📚 Related Documents

- [Design System Implementation Guide](./DESIGN_SYSTEM_IMPLEMENTATION_GUIDE.md)
- [Frontend Backlog](../backlog/BACKLOG_FRONTEND.md)
- [Frontend Architecture](./FRONTEND_ARCHITECTURE.md)

---

**Created**: 2026-06-12  
**Phase**: FE-0 → FE-1 Transition  
**Next Update**: After 5 components completed

Use this as the gold standard for all components! 🎯
