# Frontend Development — Quick Start Guide

**Goal**: Start building UI components today. No backend dependencies. Ship a polished extension by end of month.

---

## Prerequisites

```bash
# Node.js 18+
node --version

# pnpm (or npm)
pnpm --version

# Install dependencies
pnpm install

# Verify setup
pnpm run build
pnpm run test
```

---

## Project Structure (Frontend-Focused)

```
extension/
├── src/
│   ├── sidepanel/
│   │   ├── main.ts          ← Entry point (soon: render React)
│   │   ├── index.html       ← Main HTML
│   │   └── styles.css       ← Global styles (to refactor)
│   ├── storage/
│   │   └── adapter.ts       ← NEW: Storage interface (Phase 4 ready)
│   ├── background/
│   │   └── index.ts         ← Background script (keep unchanged)
│   └── content/
│       └── injector.ts      ← Content script (keep unchanged)
│
packages/
├── shared-types/            ← TypeScript types (read-only for FE)
│   └── src/index.ts
├── rule-engine/             ← Business logic (imported by FE, not changed by FE)
│   └── src/**
└── component-library/       ← NEW: Isolated components (create this!)
    ├── src/
    │   ├── Button.tsx
    │   ├── Button.test.tsx
    │   ├── Button.stories.tsx
    │   ├── Card.tsx
    │   ├── Card.stories.tsx
    │   └── ...
    ├── package.json
    ├── vite.config.ts       ← Storybook config
    └── tsconfig.json
```

---

## Step 1: Create Component Library Package

```bash
# Create directory
mkdir -p packages/component-library/src

# Copy template
cat > packages/component-library/package.json << 'EOF'
{
  "name": "@qa-interceptor/component-library",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build": "tsc -p tsconfig.json",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@storybook/react": "^7.0.0",
    "@storybook/addon-essentials": "^7.0.0",
    "typescript": "^5.0.0",
    "vitest": "^0.34.0"
  }
}
EOF

# Create tsconfig
cat > packages/component-library/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
EOF

# Install dependencies
cd packages/component-library
pnpm install
cd ../..
```

---

## Step 2: Build First Component (Button)

```typescript
// packages/component-library/src/Button.tsx

import React from "react";

export interface ButtonProps {
  /** Visual variant */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Is button disabled? */
  disabled?: boolean;
  /** Show loading spinner? */
  isLoading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Button label */
  children: React.ReactNode;
  /** HTML class for custom styling */
  className?: string;
  /** Button type */
  type?: "button" | "submit" | "reset";
}

/**
 * Versatile button component with semantic variants.
 * Base styles from DESIGN_SYSTEM.md.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      disabled = false,
      isLoading = false,
      onClick,
      children,
      className = "",
      type = "button",
    },
    ref
  ) => {
    const baseClasses = `
      btn btn--${variant} btn--${size}
      ${disabled ? "is-disabled" : ""}
      ${isLoading ? "is-loading" : ""}
      ${className}
    `.trim();

    return (
      <button
        ref={ref}
        className={baseClasses}
        disabled={disabled || isLoading}
        onClick={onClick}
        type={type}
        aria-busy={isLoading}
      >
        {isLoading ? <Spinner size="sm" /> : children}
      </button>
    );
  }
);

Button.displayName = "Button";
```

```tsx
// packages/component-library/src/Button.stories.tsx

import { Button } from "./Button";

export default { component: Button };

export const Primary = () => (
  <Button variant="primary" onClick={() => alert("Clicked!")}>
    Add Rule
  </Button>
);

export const Secondary = () => (
  <Button variant="secondary">
    Cancel
  </Button>
);

export const Disabled = () => (
  <Button variant="primary" disabled>
    Disabled
  </Button>
);

export const Loading = () => (
  <Button variant="primary" isLoading>
    Saving…
  </Button>
);

export const Danger = () => (
  <Button variant="danger">
    Delete
  </Button>
);
```

```typescript
// packages/component-library/src/Button.test.tsx

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders with label", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByText("Click"));
    expect(onClick).toHaveBeenCalled();
  });

  it("disables button when disabled prop is true", () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByText("Click")).toBeDisabled();
  });

  it("shows loading spinner when isLoading is true", () => {
    render(<Button isLoading>Saving</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });
});
```

---

## Step 3: Create CSS Design System

```css
/* extension/src/styles/design-tokens.css */

:root {
  /* Colors */
  --primary: #2f6dc4;
  --primary-hover: #1f5aa8;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  --surface-bg: #ffffff;
  --surface-alt: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border: #e5e7eb;

  /* Dark mode */
  --dark-primary: #5b9fff;
  --dark-surface-bg: #1f2937;
  --dark-surface-alt: #111827;
  --dark-text-primary: #f3f4f6;
  --dark-text-secondary: #d1d5db;
  --dark-border: #374151;

  /* Spacing */
  --space-2: 2px;
  --space-4: 4px;
  --space-8: 8px;
  --space-12: 12px;
  --space-16: 16px;
  --space-24: 24px;

  /* Typography */
  --font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-family-mono: "Fira Code", "Source Code Pro", monospace;
  --font-size-body: 16px;
  --font-size-sm: 14px;
  --font-size-xs: 12px;
  --line-height: 1.5;

  /* Animation */
  --transition-micro: 100ms ease-out;
  --transition-normal: 300ms ease-out;
  --transition-slow: 500ms ease-in-out;

  /* Z-index */
  --z-modal: 1000;
  --z-popover: 500;
  --z-dropdown: 100;
}

/* Dark mode */
[data-theme="dark"] {
  --primary: var(--dark-primary);
  --surface-bg: var(--dark-surface-bg);
  --surface-alt: var(--dark-surface-alt);
  --text-primary: var(--dark-text-primary);
  --text-secondary: var(--dark-text-secondary);
  --border: var(--dark-border);
}

/* Base styles */
* {
  box-sizing: border-box;
}

html {
  color-scheme: light;
}

[data-theme="dark"] {
  color-scheme: dark;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  line-height: var(--line-height);
  color: var(--text-primary);
  background: var(--surface-bg);
  margin: 0;
  padding: 0;
}

/* Button base */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-8);
  border: 1px solid transparent;
  border-radius: 8px;
  padding: var(--space-8) var(--space-12);
  font-size: var(--font-size-body);
  font-family: var(--font-family);
  cursor: pointer;
  transition: background-color var(--transition-micro),
              border-color var(--transition-micro),
              transform var(--transition-micro);
}

.btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.btn:disabled,
.btn.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Variants */
.btn--primary {
  background: var(--primary);
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn--secondary {
  background: transparent;
  border-color: var(--border);
  color: var(--text-primary);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--surface-alt);
  border-color: var(--text-secondary);
}

.btn--ghost {
  background: transparent;
  color: var(--text-primary);
}

.btn--ghost:hover:not(:disabled) {
  text-decoration: underline;
}

.btn--danger {
  background: var(--error);
  color: white;
}

.btn--danger:hover:not(:disabled) {
  opacity: 0.9;
}

/* Sizes */
.btn--sm {
  padding: var(--space-4) var(--space-8);
  font-size: var(--font-size-sm);
}

.btn--lg {
  padding: var(--space-12) var(--space-16);
  font-size: var(--font-size-body);
}

/* Loading state */
.btn.is-loading {
  opacity: 0.7;
  pointer-events: none;
}
```

---

## Step 4: Start Storybook

```bash
cd packages/component-library
pnpm storybook

# Opens at http://localhost:6006
```

Now you can:
- See Button component in different states (Primary, Secondary, Loading, Disabled)
- Edit component code → hot reload in browser
- No chrome extension needed
- No backend needed

---

## Step 5: Build More Components (Template)

For each component:

```typescript
// packages/component-library/src/ComponentName.tsx

import React from "react";

export interface ComponentNameProps {
  // Define props
}

export const ComponentName: React.FC<ComponentNameProps> = ({ /* props */ }) => {
  return (
    <div className="component-name">
      {/* JSX */}
    </div>
  );
};
```

```tsx
// packages/component-library/src/ComponentName.stories.tsx

import { ComponentName } from "./ComponentName";

export default { component: ComponentName };

export const Default = () => <ComponentName />;
export const Variant1 = () => <ComponentName variant="variant1" />;
```

---

## Step 6: Integrate into Extension (Later)

Once components are ready and backend features are implemented:

```typescript
// extension/src/sidepanel/main.ts

import React from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@qa-interceptor/component-library";
import { loadRules } from "@qa-interceptor/rule-engine";

const root = createRoot(document.getElementById("app")!);

// On mount
loadRules().then((rules) => {
  root.render(
    React.createElement("main", null,
      React.createElement(Button, { onClick: () => console.log("Add rule") }, "Add Rule"),
      React.createElement(RulesList, { rules })
    )
  );
});
```

---

## Development Workflow

### Daily Workflow

```bash
# Terminal 1: Watch for changes
cd extension
pnpm run build --watch

# Terminal 2: Run Storybook (if building components)
cd packages/component-library
pnpm storybook

# Terminal 3: Run tests
pnpm run test --watch

# Terminal 4: Reload extension in browser
# (Chrome → Manage Extensions → Reload)
```

### Commit Checklist

Before committing component code:

```bash
# Run tests locally
pnpm test

# Run linter
pnpm run lint

# Check TypeScript
pnpm run type-check

# Verify build
pnpm run build

# Commit
git add .
git commit -m "feat(components): add Button and Card"
```

---

## Best Practices for Frontend Development

### 1. Always Use TypeScript

```tsx
// ✓ Good
interface ButtonProps {
  variant: "primary" | "secondary";
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ variant, onClick }) => {
  // …
};

// ✗ Bad (don't use any)
export const Button = (props: any) => {
  // …
};
```

### 2. Keep Components Agnóstic

```tsx
// ✓ Good (accepts data via props)
interface RuleCardProps {
  rule: Rule;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
}

export const RuleCard: React.FC<RuleCardProps> = ({ rule, onEdit, onDelete }) => {
  // …
};

// ✗ Bad (fetches data internally, hard to test)
export const RuleCard: React.FC<{ ruleId: string }> = ({ ruleId }) => {
  const [rule, setRule] = useState<Rule | null>(null);
  useEffect(() => {
    loadRule(ruleId).then(setRule); // ← Tight coupling
  }, []);
  // …
};
```

### 3. Make Components Accessible

```tsx
// ✓ Good (ARIA labels, semantic HTML)
<button
  className="btn"
  onClick={() => setOpen(!open)}
  aria-expanded={open}
  aria-controls="dropdown-menu"
>
  Menu
</button>

// ✗ Bad (div as button, no ARIA)
<div className="btn" onClick={() => setOpen(!open)}>
  Menu
</div>
```

### 4. Test Components in Isolation

```tsx
// ✓ Good (Storybook + unit tests)
// packages/component-library/src/Button.stories.tsx
// packages/component-library/src/Button.test.tsx

// ✗ Bad (only integration tests)
// tests/e2e/extension.spec.ts (don't test here first)
```

### 5. Use CSS Custom Properties for Theming

```css
/* ✓ Good (theme-aware) */
.card {
  background: var(--surface-bg);
  color: var(--text-primary);
  border-color: var(--border);
}

/* ✗ Bad (hardcoded colors, not themable) */
.card {
  background: #ffffff;
  color: #111827;
  border-color: #e5e7eb;
}
```

---

## Roadmap

- **Week 1**: Set up component library, build 5–10 base components (Button, Input, Card, Badge, etc.)
- **Week 2**: Build feature layouts (Rules, Network, Mocks with mock data)
- **Week 3**: Implement dark mode, animations, responsive design
- **Week 4**: Accessibility audit, Storybook docs
- **Week 5+**: Integrate with backend features as they come online

**Frontend ships independently. No waiting for backend.**

---

## Resources

- **DESIGN_SYSTEM.md** — Design tokens, colors, typography
- **BACKLOG_FRONTEND.md** — Full task list
- **UI_UX_PREVIEW.md** — Visual mockups of all views
- **FRONTEND_INTEGRATION_STRATEGY.md** — How to wire components to backend

---

## Questions?

Ask in Slack or open an issue. Pair programming sessions available for complex components.

Good luck! 🚀
