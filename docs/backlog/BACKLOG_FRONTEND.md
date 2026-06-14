# QA.Interceptor — Frontend Backlog

**Legend**: DESIGNER (design tokens, layout specs) | DEVELOPER (component implementation, styling) | PRIORITY (P0–P3) | EFFORT (XS–XL) | PHASE (frontend roadmap)

---

## PHASE FE-0: Design System & Foundation

### Design Tokens & Setup

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **DES-001** | CSS custom properties & color palette | DESIGNER | P0 | XS | Ready | Define --primary, --success, --error, semantic tokens in global.css |
| **DES-002** | Typography system & font stack | DESIGNER | P0 | XS | Ready | Inter 16px body, 14px small, heading scales; Fira Code for code |
| **DES-003** | Spacing scale & layout grid | DESIGNER | P0 | XS | Ready | 2/4/8/12/16/24/32/48/64px scale; define gap/padding conventions |
| **DES-004** | Animation primitives & easing | DESIGNER | P0 | S | Ready | Micro (100ms), Normal (300ms), Slow (500ms); easings for each |
| **DES-005** | Focus ring & keyboard focus styles | DESIGNER | P0 | S | Ready | 2px blue outline, 2px offset; `:focus-visible` for all interactive |
| **DES-006** | Light/dark theme CSS variables | DESIGNER | P0 | M | Ready | Dual color palette (--surface-bg light/dark, etc.); `[data-theme]` selector |

### Base HTML & Global Styles

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **CSS-001** | Global reset & base styles | DEVELOPER | P0 | M | Ready | Normalize, box-sizing, font stack, line-height, remove defaults |
| **CSS-002** | Dark mode toggle hook in HTML | DEVELOPER | P0 | S | Ready | `<html data-theme="light">` attribute; JavaScript sets on init from storage |
| **CSS-003** | Responsive breakpoint variables | DEVELOPER | P0 | S | Ready | `--bp-mobile`, `--bp-tablet`, `--bp-laptop`; media query helpers |
| **CSS-004** | Print styles (export evidence) | DEVELOPER | P1 | M | Ready | Hide nav, full-width content, adjust colors for paper |

---

## PHASE FE-1: Core Component Library

### Button Components

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **BTN-001** | Primary button component | DEVELOPER | P0 | S | Not Started | Solid bg, hover lift effect, focus ring, disabled state, loading spinner |
| **BTN-002** | Secondary button component | DEVELOPER | P0 | S | Not Started | Outline + transparent, hover bg shift |
| **BTN-003** | Ghost / text-only button | DEVELOPER | P0 | S | Not Started | No border, underline on hover |
| **BTN-004** | Compact / toolbar button | DEVELOPER | P0 | S | Not Started | 4px padding, icon + optional label, density |
| **BTN-005** | Danger / destructive button | DEVELOPER | P0 | S | Not Started | Error color, confirmation on click optional |

### Input & Form Components

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **INP-001** | Text input base | DEVELOPER | P0 | S | Not Started | 6px border-radius, 8px padding, focus ring, placeholder, clear button |
| **INP-002** | Search input with icon | DEVELOPER | P0 | S | Not Started | Magnifying glass SVG, debounce helper, clear on focus/blur |
| **INP-003** | Select / dropdown component | DEVELOPER | P0 | M | Not Started | Custom select (not native), keyboard nav, grouping support, search |
| **INP-004** | Toggle / switch component | DEVELOPER | P0 | S | Not Started | Animated track, instant feedback, a11y labels |
| **INP-005** | Checkbox component | DEVELOPER | P0 | S | Not Started | Square 16x16, blue checkmark, indeterminate state |
| **INP-006** | Radio button group | DEVELOPER | P0 | S | Not Started | Circular, grouped with legend, keyboard arrow nav |
| **INP-007** | Number input with +/- buttons | DEVELOPER | P0 | S | Not Started | Stepper buttons, min/max validation, drag-to-increase |
| **INP-008** | Textarea component | DEVELOPER | P0 | S | Not Started | Resizable, auto-expand on content, character counter optional |

### Display Components

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **DSP-001** | Card component | DEVELOPER | P0 | S | Not Started | White bg, 1px border, 8px radius, shadow on hover, padding standards |
| **DSP-002** | Badge / pill component | DEVELOPER | P0 | S | Not Started | Semantic colors (success/error/warning/info), small text, icon optional |
| **DSP-003** | Status indicator (icon + text) | DEVELOPER | P0 | S | Not Started | ✓/✗/⚠/ℹ icons, color-coded, inline/block layout |
| **DSP-004** | Tabs component | DEVELOPER | P0 | M | Not Started | Underline active, keyboard arrow nav, lazy-load panels |
| **DSP-005** | Accordion / expandable panel | DEVELOPER | P0 | M | Not Started | Chevron icon, smooth expand animation, nested support, keyboard a11y |
| **DSP-006** | Loading spinner | DEVELOPER | P0 | S | Not Started | SVG-based, semantic color, 3 sizes (small/normal/large) |
| **DSP-007** | Toast / notification | DEVELOPER | P0 | M | Not Started | Slide-in from top-right, auto-dismiss 5s, manual close, stacked |

### Data Display

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **TAB-001** | Table component | DEVELOPER | P0 | L | Not Started | Sortable cols, sticky header, row hover, compact/spacious modes |
| **TAB-002** | List item component | DEVELOPER | P0 | S | Not Started | Avatar + title + description + actions, hover state |
| **TAB-003** | Code block display | DEVELOPER | P0 | M | Not Started | Syntax highlight (highlight.js), copy button, line numbers optional |
| **TAB-004** | Diff viewer (side-by-side) | DEVELOPER | P0 | L | Not Started | Line diff, added/removed/unchanged colors, synchronized scroll |

### Modal & Dialog

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **MOD-001** | Modal component | DEVELOPER | P0 | M | Not Started | Backdrop, centered, focus trap, keyboard escape, animations |
| **MOD-002** | Dialog/form modal | DEVELOPER | P0 | M | Not Started | Title + description + form + action buttons (OK/Cancel) |
| **MOD-003** | Confirmation dialog | DEVELOPER | P0 | S | Not Started | Danger/warning variant, auto-focus on Cancel (safe default) |
| **MOD-004** | Popover / tooltip | DEVELOPER | P0 | M | Not Started | Arrow, smart positioning (auto-flip if near edge), dark variant |

---

## PHASE FE-2: Feature Layouts (Agnóstic Component Structure)

### Rules Feature UI

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **RUL-UI-001** | Rules list layout (agnóstic) | DEVELOPER | P0 | L | Not Started | Card-based list, each rule shows: name / type / enabled toggle / actions menu; mock data injectsable |
| **RUL-UI-002** | Rule detail panel (read-only preview) | DEVELOPER | P0 | M | Not Started | Header (name + type) + condition section + payload preview; expandable |
| **RUL-UI-003** | Rule editor modal skeleton | DEVELOPER | P0 | L | Not Started | Form layout: name / type / priority / condition / payload; tabs for advanced; not wired to backend yet |
| **RUL-UI-004** | Rule group header & badge | DEVELOPER | P0 | S | Not Started | Group name + enable/disable all + rule count |
| **RUL-UI-005** | Rule type icon system | DESIGNER | P0 | S | Not Started | SVG icons for each rule type (rewrite-url, mock-response, etc.) |

### Network Inspector UI

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **NET-UI-001** | Network list (agnóstic) | DEVELOPER | P0 | L | Not Started | Waterfall-style, columns: method / URL / status / time / size; sortable; filterable |
| **NET-UI-002** | Request detail panel | DEVELOPER | P0 | M | In Progress | Tab structure: Headers / Body / Assertions / Rules Matched; agnóstic, mockable data |
| **NET-UI-003** | Response viewer (JSON / text) | DEVELOPER | P0 | L | Not Started | Syntax-highlighted code, copy button, format (pretty/minified toggle) |
| **NET-UI-004** | Assertion visual builder | DEVELOPER | P0 | M | Not Started | Builder UI (select assertion type + condition), not connected to backend rules yet |
| **NET-UI-005** | Diff panel (side-by-side) | DEVELOPER | P0 | L | Not Started | Baseline vs current, line-by-line diff, color-coded (added/removed) |

### Mocks Feature UI

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **MCK-UI-001** | Mock templates grid | DEVELOPER | P0 | L | Not Started | Card grid, each: template name / preview / use button; filterable by type |
| **MCK-UI-002** | Mock editor (modal) | DEVELOPER | P0 | L | Not Started | Form: URL pattern / method / response body (JSON editor) / delay; not wired yet |
| **MCK-UI-003** | Response builder (JSON editor) | DEVELOPER | P0 | L | Not Started | Full JSON editor with syntax highlight, auto-format, schema validation UI (not impl yet) |
| **MCK-UI-004** | Environment variables list | DEVELOPER | P0 | M | Not Started | Table: name / value / used-in (list mocks); add/edit/delete UI (not backend) |
| **MCK-UI-005** | Mock condition builder (UI preview) | DEVELOPER | P0 | M | Not Started | Build UI for conditional mocks (MOCK-001 feature) — form for conditions; not logic yet |

### History & Evidence UI

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **HST-UI-001** | Session list | DEVELOPER | P0 | M | Not Started | Cards: session name / date / request count / duration; preview thumbnails |
| **HST-UI-002** | Session replay player UI | DEVELOPER | P0 | L | In Progress | Timeline + play/pause/step controls, playback speed, current-step highlight |
| **HST-UI-003** | Evidence export dialog | DEVELOPER | P0 | M | Not Started | Format selector (JSON/Markdown/HTML) + preview + download button |
| **HST-UI-004** | Report viewer (HTML/Markdown) | DEVELOPER | P0 | L | Not Started | Formatted evidence display, printable, professional layout |

### Settings UI

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **SET-UI-001** | Settings layout (tabs) | DEVELOPER | P0 | M | Not Started | Tabs: General / Assertions / Error Profiles / Integrations / About |
| **SET-UI-002** | Theme toggle | DEVELOPER | P0 | S | Not Started | Light/dark/system selector, instant apply |
| **SET-UI-003** | Error profile editor | DEVELOPER | P0 | M | Not Started | Define error code mappings (e.g., 500 → "Server Error"); table editor |
| **SET-UI-004** | Integrations panel | DEVELOPER | P1 | M | Not Started | Cards for CI/CD integrations (GitHub, etc.); not connected yet |

---

## PHASE FE-3: Theming & Refinement

### Light/Dark Theme

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **THM-001** | Dark theme CSS palette | DESIGNER | P0 | M | Not Started | All semantic colors darkened, ensure 4.5:1 contrast ratio on all text |
| **THM-002** | Dark theme component refinements | DEVELOPER | P1 | L | Not Started | Test all components in dark mode, adjust shadows/borders for visibility |
| **THM-003** | System theme detection (prefers-color-scheme) | DEVELOPER | P1 | S | Not Started | Detect OS theme on first load, store user preference in chrome.storage |
| **THM-004** | Smooth theme transition animation | DEVELOPER | P1 | S | Not Started | Fade transition when toggling theme (avoid jarring color shift) |

### Visual Refinements

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **REF-001** | Hover & interaction feedback | DEVELOPER | P0 | M | Not Started | All interactive elements: smooth color/scale changes, no lag |
| **REF-002** | Loading state animations | DEVELOPER | P0 | M | Not Started | Skeleton loaders for data placeholders, spinner for async operations |
| **REF-003** | Empty state illustrations | DESIGNER | P1 | L | Not Started | Custom SVG for empty rules, no network activity, etc. |
| **REF-004** | Micro-interactions (success/error feedback) | DEVELOPER | P1 | M | Not Started | Toast on copy, checkmark animation on success, shake on error |
| **REF-005** | Gradient accents (optional) | DESIGNER | P2 | S | Not Started | Subtle gradients in headers, cards, backgrounds for visual hierarchy |

---

## PHASE FE-4: Desktop & Responsive

### Desktop App (Electron) UI

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **DES-UI-001** | Window chrome & titlebar | DEVELOPER | P1 | M | Phase 4 | Custom titlebar, minimize/maximize/close buttons; respect OS theme |
| **DES-UI-002** | Sidebar resizing | DEVELOPER | P1 | S | Phase 4 | Drag-to-resize between sidebar (240–600px) and content |
| **DES-UI-003** | Multi-window support layout | DEVELOPER | P1 | L | Phase 4 | Detach panels (e.g., network inspector) into separate windows |
| **DES-UI-004** | Keyboard shortcuts menu | DEVELOPER | P1 | M | Phase 4 | Accessible via Cmd+K (macOS) or Ctrl+K (Windows), shows all shortcuts |
| **DES-UI-005** | Context menus (right-click) | DEVELOPER | P1 | M | Phase 4 | Native context menus on rules, requests, etc. (copy, export, delete, etc.) |

### Responsive Breakpoints

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **RES-001** | Tablet layout (768–1024px) | DEVELOPER | P2 | M | Not Started | Collapse sidebar, stack view horizontally, hide toolbar labels |
| **RES-002** | Large screen layout (2K+) | DEVELOPER | P2 | S | Not Started | Multi-column layouts, sidebar resizable, increased content width |

---

## PHASE FE-5: Accessibility & Performance

### Accessibility (WCAG 2.1 AA)

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **A11Y-001** | Full keyboard navigation | DEVELOPER | P1 | L | Not Started | Tab order explicit, focus management in modals, skip-to-content link |
| **A11Y-002** | ARIA labels & descriptions | DEVELOPER | P1 | M | Not Started | All complex components: modal, dropdown, tabs, accordion, table |
| **A11Y-003** | Screen reader testing | DEVELOPER | P1 | M | Not Started | NVDA (Windows) + VoiceOver (macOS) testing; semantic HTML |
| **A11Y-004** | Color contrast audit | DEVELOPER | P1 | M | Not Started | Audit all text/UI components, ensure 4.5:1 (AAA where possible) |
| **A11Y-005** | Reduced motion support | DEVELOPER | P1 | S | Not Started | Respect `prefers-reduced-motion`, disable animations for users |

### Performance & Optimization

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **PERF-001** | CSS bundle minification | DEVELOPER | P1 | S | Not Started | Vite CSS optimization, remove unused classes, critical CSS inlining |
| **PERF-002** | Component code splitting | DEVELOPER | P1 | M | Not Started | Lazy-load feature views (rules, network, etc.); don't load all components upfront |
| **PERF-003** | Virtualization for long lists | DEVELOPER | P2 | L | Not Started | Virtual scrolling for 1000+ network requests or rules (use react-window) |
| **PERF-004** | Image & SVG optimization | DEVELOPER | P1 | S | Not Started | Optimize SVG icons, use WebP where supported |

---

## PHASE FE-6: Documentation & Developer Experience

### Storybook & Component Docs

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **DOC-001** | Setup Storybook (component library) | DEVELOPER | P2 | L | Not Started | stories for all base components (Button, Input, Card, etc.) |
| **DOC-002** | Component usage guide | DESIGNER | P2 | M | Not Started | Markdown docs: when to use each component, props, examples |
| **DOC-003** | Design token documentation | DESIGNER | P2 | S | Not Started | Interactive token showcase, CSS variable reference |
| **DOC-004** | UI Kit exports (Figma → Code) | DESIGNER | P3 | M | Not Started | Maintain Figma file as source of truth, auto-export components |

---

## BACKLOG SUMMARY — FRONTEND

| Phase | Features | Architect | Developer | Designer | Status |
|-------|----------|-----------|-----------|----------|--------|
| **FE-0** | Design System (6 items) | — | 4 | 2 | Ready |
| **FE-1** | Components (25 items) | — | 25 | 0 | Not Started |
| **FE-2** | Feature Layouts (18 items) | — | 14 | 4 | Not Started |
| **FE-3** | Theming (8 items) | — | 5 | 3 | Not Started |
| **FE-4** | Desktop/Responsive (6 items) | — | 6 | 0 | Not Started |
| **FE-5** | Accessibility (5 items) | — | 5 | 0 | Not Started |
| **FE-6** | Documentation (4 items) | — | 2 | 2 | Not Started |
| **TOTAL** | **72 items** | — | **61** | **11** | |

---

## Integration Notes

- **All components are agnóstic** — they accept mock data via props initially, then wire to backend rules/storage later
- **No blocking dependencies** — FE teams can build & test UI independently while backend teams implement features
- **Parallel tracks** — FE-0 and FE-1 (foundation + components) can start immediately; FE-2 (features) can start in parallel
- **Testing strategy** — Mock data in Storybook; integration tests wire to actual backend/storage adapters later
