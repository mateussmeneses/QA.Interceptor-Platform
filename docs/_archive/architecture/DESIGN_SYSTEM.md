# QA.Interceptor — Frontend Roadmap & Design System

**Goal**: Modern, intuitive UI inspired by Requestly but tailored for QA workflows. Build agnóstic components now; wire to backend logic later.

---

## Design Principles

1. **Clarity over cuteness** — Help QA engineers find what they need in < 3 seconds
2. **Progressive disclosure** — Show basic controls first, advanced options on demand
3. **Real-time feedback** — Network requests/rules match instantly, no loading states where avoidable
4. **Mobile-first considerations** — Plan for Electron desktop + browser, not mobile (for now)
5. **Accessibility by default** — WCAG 2.1 AA standard, keyboard navigation throughout

---

## Color Palette & Design Tokens

### Semantic Colors

| Token              | Light     | Dark      | Usage                                           |
| ------------------ | --------- | --------- | ----------------------------------------------- |
| `--primary`        | `#2F6DC4` | `#5B9FFF` | Active states, CTAs, focus rings                |
| `--success`        | `#10B981` | `#34D399` | Assertions pass, enabled rules, 2xx responses   |
| `--warning`        | `#F59E0B` | `#FBBF24` | Rule conflicts, 3xx responses, attention needed |
| `--error`          | `#EF4444` | `#F87171` | Assertions fail, errors, 4xx/5xx, disabled      |
| `--info`           | `#3B82F6` | `#60A5FA` | Info badges, hints, rule type indicators        |
| `--surface-bg`     | `#FFFFFF` | `#1F2937` | Card backgrounds, panels                        |
| `--surface-alt`    | `#F3F4F6` | `#111827` | Hover states, alternates                        |
| `--text-primary`   | `#111827` | `#F3F4F6` | Body text                                       |
| `--text-secondary` | `#6B7280` | `#D1D5DB` | Helper text, labels                             |
| `--border`         | `#E5E7EB` | `#374151` | Dividers, outlines                              |

### Spacing Scale

```
2px, 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
```

### Typography

```
Font family: "Inter", "Segoe UI", system-ui
Body:       16px / 1.5 line-height
Small:      14px
Tiny:       12px
Heading 1:  28px / 700 font-weight
Heading 2:  24px / 600 font-weight
Heading 3:  20px / 600 font-weight
Mono:       "Fira Code", "Source Code Pro" (for code blocks, headers)
```

---

## Component Library (Base)

### Status

| Icon | Semantics  | Color           | Usage                                    |
| ---- | ---------- | --------------- | ---------------------------------------- |
| ✓    | Success    | Green           | Passed assertions, enabled, healthy      |
| ✗    | Error      | Red             | Failed assertions, disabled, error state |
| ⚠    | Warning    | Yellow          | Conflicts, attention needed, deprecated  |
| ℹ    | Info       | Blue            | Informational badge, neutral state       |
| ↻    | Processing | Blue (animated) | Loading, in-flight request               |

### Button Variants

```
Primary      — Solid primary, rounded corners, 8px padding, hover lift
Secondary    — Outline + transparent bg, same padding
Ghost        — Text-only, no border, hover underline + color shift
Danger       — Solid error color (for destructive actions)
Disabled     — Grayed, no pointer events, cursor: not-allowed
Compact      — 4px padding (for toolbar denseness)
Size L       — 14px + 8px padding (default)
```

### Input Components

```
Text input      — rounded 6px border, 8px padding, focus ring blue
Search input    — magnifying glass icon inside, clear button on focus
Select/dropdown — chevron icon, opens popover, keyboard navigation
Toggle          — compact switch, instant feedback
Checkbox        — square 16x16, blue checkmark
```

### Cards & Panels

```
Card           — white bg, 1px border, 8px rounded, shadow on hover
Panel          — full-width container, header + body + footer
Expandable     — header with chevron icon, smooth expand animation
Badge          — small pill, inline with text, semantic color
```

### Modals & Dialogs

```
Modal          — centered, semi-transparent backdrop, keyboard escape support
Dialog         — form-style modal, OK/Cancel buttons, focus trap
Confirmation   — small modal, title + description + action buttons
```

---

## Layout Architecture

### Main Sidepanel (Default: 360px, Resizable to 240px–600px)

```
┌─────────────────────────────────┐
│  QA.Interceptor                 │  ← Brand bar (sticky)
├─────────────────────────────────┤
│ ☰ Rules        [5 enabled]      │  ← Nav with inline stats
│ ☰ Network      [12 captured]    │
│ ☰ Mocks        [3 active]       │
│ ☰ History      [2 sessions]     │
│ ☰ Settings                      │
├─────────────────────────────────┤
│                                 │
│  [Content for active view]      │  ← Flex container, scrollable
│  (rules list, network inspector,│
│   mock builder, etc.)           │
│                                 │
├─────────────────────────────────┤
│ [Status bar / footer]           │  ← Optional: rule conflicts, proxy status
└─────────────────────────────────┘
```

### Content Views (Rules / Network / Mocks / History / Settings)

Each view follows a standard structure:

```
┌─────────────────────────────────┐
│ View Title                      │  ← .view-header
│ Subtitle or filters             │
├─────────────────────────────────┤
│ [Toolbar: Add, Search, Filter]  │  ← .view-toolbar
├─────────────────────────────────┤
│                                 │
│  [List / Table / Grid]          │  ← .view-content
│                                 │
│  Row 1 (hoverable)              │
│  Row 2                          │
│  ...                            │
│  [Load more / pagination]       │
│                                 │
└─────────────────────────────────┘
```

---

## Responsive Strategy

### Desktop (1920px+)

- Sidepanel: 360px fixed, content full-width
- Hover states active, keyboard shortcuts visible

### Laptop (1024–1920px)

- Sidepanel: 360px, resizable
- Toolbar icons + labels (default)

### Tablet (768–1024px)

- Sidepanel: 280px (or collapsed)
- Toolbar icons only (labels on hover)

### Mobile (< 768px)

- Not primary target for extension, but plan for mobile web (Phase 5)

---

## Dark Mode Strategy

- Toggle in Settings → stored in chrome.storage
- CSS variables swap via `[data-theme="dark"]` on `<html>`
- No JS flashing — load theme immediately from storage on init
- All components inherit via CSS custom properties

---

## Animation Palette

```
Micro (100–150ms):  State changes (button hover, toggle, focus)
Normal (200–300ms): View transitions, slide-ins, expands
Slow (400–600ms):   Page transitions, major layout shifts
Easing:             ease-out (responsive), ease-in-out (modal), ease-in (exit)
```

**No animation loops** — they distract from content; use only for state transitions.

---

## Accessibility

- All interactive elements keyboard-navigable (tab order explicit)
- Focus ring always visible (2px blue outline, 2px offset)
- Color not sole indicator (always pair with icon, text, or pattern)
- Contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for UI components
- ARIA labels for complex components (modals, dropdowns, custom elements)
- No auto-play audio/video
- Form labels explicit (not placeholder-only)

---

## Component Storybook

Future home for isolated component development & testing:

```
packages/component-library/
├── src/
│   ├── Button.tsx
│   ├── Button.stories.tsx
│   ├── Card.tsx
│   ├── Card.stories.tsx
│   └── ... (all base components)
├── package.json
└── vite.config.ts (Storybook + Vitest)
```

Allow developers to build UI without running the extension.

---

## Implementation Phases

See BACKLOG_FRONTEND.md for detailed task breakdown.
