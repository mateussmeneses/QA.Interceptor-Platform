# QA.Interceptor — Design System Implementation Guide

**Status**: ✅ Phase FE-0 — Design Foundation Complete

This document explains how the design system is implemented and how to use it when building components.

---

## 📁 Project Structure

```
extension/src/sidepanel/
├── styles/
│   ├── index.css              # Main entry point (imports all others)
│   ├── tokens.css             # CSS variables (colors, typography, spacing)
│   ├── global.css             # Reset, base styles, print styles
│   ├── layout.css             # Utility classes (flex, grid, margins, etc.)
│   └── components/            # Component-specific styles (coming next)
│       ├── button.css
│       ├── input.css
│       ├── modal.css
│       └── ...
├── shared/
│   ├── theme-manager.ts       # Light/dark mode toggle
│   └── types.ts
├── features/
│   ├── rules.ts
│   ├── network.ts
│   ├── mocks.ts
│   ├── history.ts
│   ├── settings.ts
│   └── navigation.ts
└── main.ts
```

---

## 🎨 Using Design Tokens

### Color Palette

All colors are defined as CSS custom properties in `styles/tokens.css`.

#### Light Mode (default)
```css
--primary: #2F6DC4
--success: #10B981
--warning: #F59E0B
--error: #EF4444
--info: #3B82F6

--surface-bg: #FFFFFF
--surface-alt: #F3F4F6
--text-primary: #111827
--text-secondary: #6B7280
```

#### Dark Mode
```css
html[data-theme="dark"] {
  --primary: #5B9FFF
  --success: #34D399
  --warning: #FBBF24
  --error: #F87171
  --info: #60A5FA

  --surface-bg: #1F2937
  --surface-alt: #111827
  --text-primary: #F3F4F6
  --text-secondary: #D1D5DB
}
```

### Using Colors in Components

**CSS**:
```css
.my-button {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: var(--spacing-m);
  border-radius: var(--radius-m);
}

.my-button:hover {
  background-color: var(--primary-hover);
}

html[data-theme="dark"] .my-button {
  /* Automatically uses dark mode colors */
}
```

**HTML**:
```html
<button class="my-button">Click me</button>
```

### Spacing Scale

```css
--spacing-xs: 2px      /* .gap-xs, .p-xs */
--spacing-2xs: 4px     /* .p-2xs */
--spacing-sm: 8px      /* .gap-sm, .p-sm */
--spacing-m-sm: 12px   /* .p-m-sm */
--spacing-m: 16px      /* .gap-m, .p-m (default) */
--spacing-l: 24px      /* .gap-l, .p-l */
--spacing-xl: 32px     /* .gap-xl, .p-xl */
--spacing-2xl: 48px    /* .p-2xl */
--spacing-3xl: 64px    /* .p-3xl */
```

### Typography

```css
--font-sans: "Inter", "Segoe UI", system-ui
--font-mono: "Fira Code", "Source Code Pro"

--font-xs: 12px
--font-sm: 14px
--font-base: 16px
--font-lg: 18px
--font-xl: 20px
--font-2xl: 24px
--font-3xl: 28px

--lh-tight: 1.2
--lh-normal: 1.5
--lh-relaxed: 1.75

--fw-regular: 400
--fw-medium: 500
--fw-semibold: 600
--fw-bold: 700
```

### Using Typography

```css
.heading {
  font-size: var(--font-2xl);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  color: var(--text-primary);
}

.body {
  font-size: var(--font-base);
  line-height: var(--lh-normal);
  color: var(--text-secondary);
}

.code-block {
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  background-color: var(--surface-alt);
}
```

### Border Radius

```css
--radius-sm: 4px
--radius-m: 6px
--radius-lg: 8px
--radius-xl: 12px
--radius-full: 9999px
```

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1)
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1)
```

### Animations

```css
--duration-micro: 100ms
--duration-fast: 150ms
--duration-base: 300ms
--duration-slow: 500ms

--ease-in: cubic-bezier(0.4, 0, 1, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
```

### Using Animations

```css
.card {
  transition: box-shadow var(--duration-base) var(--ease-in-out);
}

.button:hover {
  transition: background-color var(--duration-fast) var(--ease-out);
}

@keyframes slideIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal {
  animation: slideIn var(--duration-base) var(--ease-out);
}
```

---

## 🎯 Utility Classes

### Flexbox

```html
<div class="flex gap-m">           <!-- flex row with 16px gap -->
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<div class="flex flex-col gap-sm">  <!-- flex column with 8px gap -->
  <div>Header</div>
  <div>Content</div>
</div>

<div class="flex-center">           <!-- centered content -->
  <span>Centered</span>
</div>

<div class="flex-between">          <!-- space between -->
  <span>Left</span>
  <span>Right</span>
</div>
```

### Padding & Margin

```html
<div class="p-m">                    <!-- padding: 16px -->
  Content
</div>

<div class="px-l py-m">              <!-- padding-x: 24px, padding-y: 16px -->
  Padded content
</div>

<div class="m-m">                    <!-- margin: 16px -->
  Margined content
</div>

<div class="mb-l">                   <!-- margin-bottom: 24px -->
  Below this is 24px gap
</div>
```

### Sizing & Display

```html
<div class="w-full">                 <!-- width: 100% -->
  Full width
</div>

<div class="hidden">                 <!-- display: none -->
  Hidden
</div>

<div class="text-center">            <!-- text-align: center -->
  Centered text
</div>

<span class="line-clamp-1">          <!-- Single line, ellipsis if overflow -->
  This text will truncate with ellipsis...
</span>
```

### Colors

```html
<div class="bg-primary text-white">  <!-- primary background -->
  Primary button
</div>

<div class="bg-success">             <!-- success background -->
  Success card
</div>

<p class="text-secondary">           <!-- secondary text color -->
  Helper text
</p>

<p class="text-error">               <!-- error text color -->
  Error message
</p>
```

### Common Patterns

```html
<!-- Card -->
<div class="card">
  <h2>Card Title</h2>
  <p>Card content</p>
</div>

<!-- Panel -->
<div class="panel p-l">
  <h3>Panel Title</h3>
  <p>Panel content</p>
</div>

<!-- Rounded button container -->
<div class="rounded bg-surface border p-m">
  Content
</div>
```

---

## 🌓 Dark Mode

### Automatic Theme Detection

The app automatically detects the user's system preference:

```typescript
import { initTheme, getCurrentTheme, toggleTheme } from "./shared/theme-manager";

// Initialize theme on app startup
initTheme();

// Get current theme
const theme = getCurrentTheme(); // "light" | "dark"

// Toggle theme (usually in settings UI)
const newTheme = toggleTheme(); // Switches between light/dark
```

### Manual Theme Set

```typescript
import { setTheme } from "./shared/theme-manager";

// Set specific theme
setTheme("dark");
setTheme("light");
```

### Listen to Theme Changes

```typescript
document.addEventListener("theme-changed", (event) => {
  const theme = event.detail.theme; // "light" | "dark"
  console.log("Theme changed to:", theme);
});
```

### HTML Structure

The theme is applied via the `data-theme` attribute on the root `<html>` element:

```html
<!-- Light mode -->
<html data-theme="light">

<!-- Dark mode -->
<html data-theme="dark">
```

All CSS variables automatically switch based on this attribute:

```css
html {
  --primary: #2F6DC4;        /* light mode */
}

html[data-theme="dark"] {
  --primary: #5B9FFF;        /* dark mode */
}
```

---

## 🧩 Creating Components

### Step 1: Plan the Component

Review the backlog for which component to build:
- **Phase FE-1** contains base components: Button, Input, Card, Modal, etc.

### Step 2: Create Component File

Example: `extension/src/sidepanel/components/Button.tsx`

```typescript
import React from "react";

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "m" | "lg";
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "m",
  disabled = false,
  children,
  onClick,
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### Step 3: Create Component Styles

File: `extension/src/sidepanel/styles/components/button.css`

```css
/* ============================================================================
   BUTTON COMPONENT
   ============================================================================ */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  border: none;
  border-radius: var(--radius-m);
  font-weight: var(--fw-medium);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out),
              transform var(--duration-micro) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

/* Sizes */
.btn-sm {
  height: var(--btn-height-sm);
  padding: 0 var(--btn-padding-h-sm);
  font-size: var(--font-sm);
}

.btn-m {
  height: var(--btn-height-m);
  padding: 0 var(--btn-padding-h-m);
  font-size: var(--font-base);
}

.btn-lg {
  height: var(--btn-height-lg);
  padding: 0 var(--btn-padding-h-lg);
  font-size: var(--font-lg);
}

/* Variants */
.btn-primary {
  background-color: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-primary:active:not(:disabled) {
  background-color: var(--primary-active);
  transform: translateY(0);
}

.btn-primary:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-outline-offset);
}

.btn-secondary {
  background-color: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--interactive-hover);
}

.btn-ghost {
  background-color: transparent;
  color: var(--text-primary);
}

.btn-ghost:hover:not(:disabled) {
  background-color: var(--interactive-hover);
}

.btn-danger {
  background-color: var(--error);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: var(--error-hover);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Step 4: Import Component Styles

Add to `extension/src/sidepanel/styles/index.css`:

```css
@import "./components/button.css";
```

### Step 5: Write Tests

Create `extension/src/sidepanel/components/__tests__/Button.test.tsx`

### Step 6: Add to Storybook (future)

Create stories for component preview and testing.

---

## ✅ Checklist for Phase FE-0

- ✅ CSS tokens defined (colors, typography, spacing, shadows, animations)
- ✅ Global styles (reset, base, focus states, print)
- ✅ Utility classes (flex, grid, padding, margin, text, display)
- ✅ Theme manager (light/dark mode toggle)
- ✅ HTML structure updated with design system imports
- ✅ Documentation created

---

## 🚀 Next Steps (Phase FE-1)

Build 25 core components:
- **Button components** (5 variants): primary, secondary, ghost, danger, compact
- **Input components** (8 types): text, search, select, toggle, checkbox, radio, number, textarea
- **Display components** (7 types): card, badge, status, tabs, accordion, spinner, toast
- **Data components** (4 types): table, list item, code block, diff viewer
- **Modal components** (4 types): modal, dialog, confirmation, popover

Each component will follow the same pattern:
1. Create TypeScript component file
2. Create CSS file with tokens & utility classes
3. Write unit tests
4. Document in Storybook (future)

---

## 📚 References

- [Design System Documentation](../DESIGN_SYSTEM.md)
- [Frontend Backlog](../backlog/BACKLOG_FRONTEND.md)
- [Frontend Strategy](../FRONTEND_STRATEGY_COMPLETE.md)
- [CSS Tokens Reference](./styles/tokens.css)

---

**Created**: 2026-06-12
**Phase**: FE-0 ✅ Complete
**Next Phase**: FE-1 (Component Library)
