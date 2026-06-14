# QA.Interceptor — UI/UX Preview & Design Mockups

> This document shows the future state of the extension UI. All screens are agnóstic component layouts ready to receive data from backend features.

---

## Overall Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       QA.Interceptor Extension                         │
│  (360px wide sidepanel, responsive to 240–600px)                       │
├──────────────────────┬──────────────────────────────────────────────────┤
│                      │                                                  │
│    Brand + Nav       │         Content Area (Active View)               │
│  (204px sidebar)     │         • Scrollable                             │
│                      │         • Responsive to container size           │
│  ┌────────────────┐  │         • Dark mode capable                      │
│  │ QA.Interceptor │  │                                                  │
│  │  [Extension]   │  │                                                  │
│  ├────────────────┤  │  ┌──────────────────────────────────────────┐   │
│  │ ☰ Rules        │  │  │ Rules Workspace              [5 enabled] │   │
│  │ ☰ Network      │  │  ├──────────────────────────────────────────┤   │
│  │ ☰ Mocks        │  │  │ [🔍 Search] [+ Add Rule]                 │   │
│  │ ☰ History      │  │  │                                          │   │
│  │ ☰ Settings     │  │  ├──────────────────────────────────────────┤   │
│  │                │  │  │ [CARD] Redirect /admin                   │   │
│  │                │  │  │ Type: rewrite-url | ✓ Enabled           │   │
│  │                │  │  │ Priority: 5 | ⚠ Conflict with rule #3   │   │
│  │ [Status bar]   │  │  │ [Edit] [✓] [×]                          │   │
│  └────────────────┘  │  │                                          │   │
│                      │  │ [CARD] Mock /api/users                   │   │
│                      │  │ Type: mock-response | ✓ Enabled          │   │
│                      │  │ Priority: 10 |                           │   │
│                      │  │ [Edit] [✓] [×]                          │   │
│                      │  │                                          │   │
│                      │  │ [Load more...]                           │   │
│                      │  └──────────────────────────────────────────┘   │
│                      │                                                  │
└──────────────────────┴──────────────────────────────────────────────────┘
```

---

## View 1: Rules Workspace (Default)

**Purpose**: Create, manage, enable/disable rules with conflict detection.

```
┌──────────────────────────────────────────────────┐
│ Rules Workspace                      [5 enabled] │  ← Header with stats
├──────────────────────────────────────────────────┤
│ [🔍 Search URL/method] [+ Add Rule] [⋮ More]    │  ← Toolbar
├──────────────────────────────────────────────────┤
│                                                  │
│  Rule Card 1:                                    │
│  ┌─────────────────────────────────────────────┐ │
│  │ Redirect /admin to /dashboard               │ │  ← Rule name
│  │ Type: rewrite-url      Status: ✓ Enabled    │ │  ← Type + enabled toggle
│  │ Priority: 5            ⚠ Conflict: Overlaps │ │  ← Priority + any warnings
│  │ Condition: GET /admin/*/                    │ │  ← Condition preview
│  │                                             │ │
│  │ [Edit] [Duplicate] [↑ ↓] [⋮ More]          │ │  ← Action buttons
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  Rule Card 2:                                    │
│  ┌─────────────────────────────────────────────┐ │
│  │ Mock /api/users JSON Response               │ │
│  │ Type: mock-response    Status: ✓ Enabled    │ │
│  │ Priority: 10                                │ │
│  │ Condition: GET /api/users                   │ │
│  │                                             │ │
│  │ [Edit] [Duplicate] [↑ ↓] [⋮ More]          │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  Rule Card 3:                                    │
│  ┌─────────────────────────────────────────────┐ │
│  │ Block /api/admin/* (requires auth)          │ │
│  │ Type: block           Status: ✗ Disabled    │ │  ← Disabled visual
│  │ Priority: 2           ⚠ Makes rule 1 unreachable │
│  │ Condition: * /api/admin/*                   │ │
│  │                                             │ │
│  │ [Edit] [Duplicate] [↑ ↓] [⋮ More]          │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  [+ Add another rule]                           │
│  [Load 5 more rules...]                         │
│                                                  │
│  ⓘ Tip: Click a card to see full condition and  │
│     payload. Use ↑↓ to reorder by priority.      │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Rule Editor Modal (Expanded on [Edit])

```
╔══════════════════════════════════════════════════╗
║ Edit Rule                             [✕]       ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║ [Tab] Rule Details  [Tab] Condition  [Tab] etc.  ║
║                                                  ║
║ Rule Details:                                    ║
║ ├─ Name: [Redirect /admin___________]           ║
║ ├─ Type: [Dropdown: rewrite-url ▼]              ║
║ │        rewrite-header                         ║
║ │        rewrite-query                          ║
║ │        mock-response                          ║
║ │        …                                      ║
║ ├─ Priority: [spinner: 5]                       ║
║ └─ Group: [Dropdown: Admin Rules ▼]             ║
║                                                  ║
║ Condition:                                       ║
║ ├─ URL contains: [/admin_________]              ║
║ ├─ Method: [Dropdown: GET ▼]                    ║
║ │           GET / POST / PUT / etc.             ║
║ └─ (Add more conditions...)                     ║
║                                                  ║
║ Payload (varies by type):                        ║
║ For rewrite-url:                                 ║
║ ├─ Redirect to: [https://example.com/___]       ║
║ └─ Preserve query: [Toggle: ON]                 ║
║                                                  ║
║ For mock-response:                               ║
║ ├─ Status: [dropdown: 200 ▼]                    ║
║ ├─ Headers: [+ Add header]                      ║
║ │  ┌─────────────────────────────┐              ║
║ │  │ Content-Type: application/json              ║
║ │  │ X-Custom-Header: value      │              ║
║ │  └─────────────────────────────┘              ║
║ └─ Body (JSON editor):                           ║
║    ┌────────────────────────────────┐            ║
║    │ {                              │            ║
║    │   "users": [                   │            ║
║    │     {"id": 1, "name": "Alice"} │            ║
║    │   ]                            │            ║
║    │ }                              │            ║
║    │ [Format] [Copy] [Paste Schema] │            ║
║    └────────────────────────────────┘            ║
║                                                  ║
║ [Cancel] [Save & Enable] [Save & Disable]      ║
╚══════════════════════════════════════════════════╝
```

---

## View 2: Network Inspector

**Purpose**: Capture, inspect, diff, and assert on HTTP traffic.

```
┌──────────────────────────────────────────────────┐
│ Network Inspector                  [12 captured]│
├──────────────────────────────────────────────────┤
│ [🔍 Search URL] [🔽 Filter by status]           │
│ [Clear] [Export] [Replay]                       │
├──────────────────────────────────────────────────┤
│ Waterfall:                                       │
│  Req │ Method │ URL              │ Status │ Time │
│──────┼────────┼──────────────────┼────────┼──────┤
│  1.  │ GET    │ /api/users       │ 200 ✓  │ 234ms│
│  2.  │ POST   │ /api/users       │ 201 ✓  │ 145ms│
│  3.  │ GET    │ /api/users/1     │ 404 ✗  │ 89ms │
│  4.  │ DELETE │ /api/users/1     │ 204 ✓  │ 56ms │
│  5.  │ GET    │ /api/posts       │ 500 ✗  │ 1.2s │
│      │        │                  │ ⚠ Retry│      │
│  6.  │ GET    │ /api/posts       │ 200 ✓  │ 500ms│
│                                                  │
│ [Scroll to load more...]                        │
│                                                  │
├──────────────────────────────────────────────────┤
│ [Selected: #1 GET /api/users → 200]              │
├──────────────────────────────────────────────────┤
│ Tabs: [Request] [Response] [Assertions] [Rules]  │
│                                                  │
│ Response:                                        │
│ Status: 200 OK                                   │
│ Headers: Content-Type: application/json          │
│          Content-Length: 245                     │
│          …                                       │
│                                                  │
│ Body (JSON):                                     │
│ ┌────────────────────────────────┐               │
│ │ {                              │               │
│ │   "users": [                   │               │
│ │     {"id": 1, "name": "Alice"} │               │
│ │   ]                            │               │
│ │ }                              │               │
│ │ [Format] [Copy] [Diff Baseline]│               │
│ └────────────────────────────────┘               │
│                                                  │
│ Assertions:                                      │
│ ✓ Status == 200                                  │
│ ✓ Content-Type == application/json               │
│ ✗ $.users[0].email exists                        │
│                                                  │
│ Matched Rules:                                   │
│ → GET /api/users                                 │
│ → assert-status-200                              │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Diff Panel (Side-by-Side Comparison)

```
╔══════════════════════════════════════════════════╗
║ Compare Response (Baseline vs Current)           ║
╠════════════════════╦═════════════════════════════╣
║ Baseline (stored)  ║ Current Response            ║
├────────────────────╫─────────────────────────────┤
║ {                  ║ {                          ║
║   "users": [       ║   "users": [               ║
║     {              ║     {                      ║
║       "id": 1,     ║       "id": 1,             ║
║ ─ "name": "Alice"  ║ + "name": "Alice Smith",   ║
║       "email":     ║       "email":             ║
║                    ║ + "alice@example.com"     ║
║     },             ║     },                     ║
║ ─ {                ║     {                      ║
║ ─ "id": 2          ║       "id": 2,             ║
║ ─ "name": "Bob"    ║       "name": "Bob",       ║
║ ─ }                ║       "email": "bob@ex…"   ║
║                    ║ + }                        ║
║   ]                ║   ]                        ║
║ }                  ║ }                          ║
│                    │                            │
│ Green = added      │ Red = removed              │
│ [Clear Diff]       │ [Pin Baseline]             │
╚════════════════════╩═════════════════════════════╝
```

---

## View 3: Mocks Playground

**Purpose**: Create and test mock responses with conditional logic.

```
┌──────────────────────────────────────────────────┐
│ Mocks Playground                     [3 active] │
├──────────────────────────────────────────────────┤
│ [🔍 Search] [+ Create Mock] [Templates]         │
├──────────────────────────────────────────────────┤
│                                                  │
│ Mock 1:                                          │
│ ┌──────────────────────────────────────────────┐ │
│ │ GET /api/products → 200 JSON                 │ │
│ │ Status: ✓ Active | Requests matched: 5      │ │
│ │ Conditions:                                  │ │
│ │ • URL matches: /api/products                 │ │
│ │ • Method: GET                                │ │
│ │ • Optional: Call count < 3 (retry scenario)  │ │
│ │                                              │ │
│ │ Response:                                    │ │
│ │ ┌────────────────────────────────┐           │ │
│ │ │ {                              │           │ │
│ │ │   "products": [                │           │ │
│ │ │     {"id": 1, "name": "..."}   │           │ │
│ │ │   ]                            │           │ │
│ │ │ }                              │           │ │
│ │ └────────────────────────────────┘           │ │
│ │                                              │ │
│ │ Delay: 0ms | [Edit] [Test] [Duplicate] [×] │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ Mock 2:                                          │
│ ┌──────────────────────────────────────────────┐ │
│ │ POST /api/auth → 401 JSON (for bad token)    │ │
│ │ Status: ✓ Active | Requests matched: 2      │ │
│ │ Conditions:                                  │ │
│ │ • URL matches: /api/auth                     │ │
│ │ • Method: POST                               │ │
│ │ • Header: Authorization != "Bearer valid"    │ │
│ │                                              │ │
│ │ Response: 401 Unauthorized                   │ │
│ │                                              │ │
│ │ Delay: 100ms | [Edit] [Test] [Duplicate] [×]│ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ [+ Add another mock]                            │
│ [Templates: REST / GraphQL / gRPC]              │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Conditional Mock Builder

```
╔══════════════════════════════════════════════════╗
║ Create Conditional Mock                  [✕]    ║
╠══════════════════════════════════════════════════╣
║ URL Pattern: [GET /api/users________]           ║
║                                                  ║
║ Condition Branches:                              ║
║                                                  ║
║ Branch 1: First call                             ║
║ ├─ Condition: Sequence → nth call = 1            ║
║ ├─ Status: [500 ▼]                              ║
║ ├─ Body: {"error": "Server overloaded"}          ║
║ ├─ Delay: [1000] ms                             ║
║ └─ [Remove]                                      ║
║                                                  ║
║ Branch 2: Subsequent calls                       ║
║ ├─ Condition: Call count ≥ 2                     ║
║ ├─ Status: [200 ▼]                              ║
║ ├─ Body: {"users": [...]}                        ║
║ ├─ Delay: [100] ms                              ║
║ └─ [Remove]                                      ║
║                                                  ║
║ [+ Add Branch]                                   ║
║                                                  ║
║ Fallback (if no branch matches):                 ║
║ ├─ Status: [404 ▼]                              ║
║ └─ Body: {"error": "Not found"}                  ║
║                                                  ║
║ [Cancel] [Save & Enable]                        ║
╚══════════════════════════════════════════════════╝
```

---

## View 4: History & Evidence

**Purpose**: Replay past sessions, export evidence for reports.

```
┌──────────────────────────────────────────────────┐
│ History & Sessions                   [5 total]  │
├──────────────────────────────────────────────────┤
│ [🔍 Search sessions] [+ New Session]            │
├──────────────────────────────────────────────────┤
│                                                  │
│ Session 1:                                       │
│ ┌──────────────────────────────────────────────┐ │
│ │ "User Registration Flow"  Created: 2 hrs ago │ │
│ │ Requests: 12 | Duration: 4.2s               │ │
│ │ Assertions: 10 passed, 1 failed              │ │
│ │                                              │ │
│ │ Timeline preview:                            │ │
│ │ ├─ 1. POST /api/users        200 ✓           │ │
│ │ ├─ 2. GET /api/users/1       200 ✓           │ │
│ │ ├─ 3. POST /api/auth         401 ✗ Failed!   │ │
│ │ └─ 4-12. (8 more requests)                   │ │
│ │                                              │ │
│ │ [Replay] [Export Evidence] [View] [×]        │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ Session 2:                                       │
│ ┌──────────────────────────────────────────────┐ │
│ │ "API Regression Check"        Created: 1 day │ │
│ │ Requests: 28 | Duration: 12.1s              │ │
│ │ Assertions: 25 passed, 3 failed              │ │
│ │                                              │ │
│ │ [Replay] [Export Evidence] [View] [×]        │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ [Load more sessions...]                         │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Replay Player

```
╔══════════════════════════════════════════════════╗
║ Replay: User Registration Flow           [✕]    ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║ Timeline:                                        ║
║ ●──────●──────●──●──────────────●───────────●   ║
║ 0s     1s     2s 2.5s            4s        6s   ║
║ [|Play] [||Pause] [⏩ 2x] [Volume]              ║
║                                                  ║
║ Current: Request 3 of 12                         ║
║ ├─ POST /api/auth                               ║
║ ├─ Status: 401 ✗ (assertion failed)             ║
║ ├─ Duration: 145ms                              ║
║ └─ Timestamp: 2:34                              ║
║                                                  ║
║ Body:                                            ║
║ {"error": "Invalid credentials"}                 ║
║                                                  ║
║ ⓘ Playing…(paused at step 3/12)                 ║
║                                                  ║
║ [Step Back] [Step Forward] [Jump to End]        ║
║ [Export Evidence] [Close]                       ║
╚══════════════════════════════════════════════════╝
```

---

## View 5: Settings & Preferences

**Purpose**: Configure rules, themes, error handling.

```
┌──────────────────────────────────────────────────┐
│ Settings                                        │
├──────────────────────────────────────────────────┤
│ [Tab] General  [Tab] Assertions  [Tab] Profiles │
├──────────────────────────────────────────────────┤
│                                                  │
│ General:                                         │
│ ├─ Theme: [Light] [Dark] [System Default ✓]    │
│ ├─ Capture traffic: [Toggle: ON]                │
│ ├─ Auto-clear after: [Dropdown: 24 hours]       │
│ ├─ Max captured requests: [1000 ▼]              │
│ ├─ Proxy port: [8080]                           │
│ ├─ Enable system proxy: [Toggle: OFF]           │
│ └─ Developer mode: [Toggle: OFF]                │
│                                                  │
│ Assertions:                                      │
│ ├─ Default assertion type: [Dropdown: status]   │
│ ├─ Include response time: [Toggle: ON]          │
│ ├─ Timeout (ms): [5000]                         │
│ └─ Retry failed assertions: [Toggle: OFF]       │
│                                                  │
│ Error Profiles:                                  │
│ ├─ Add custom error code mappings               │
│ │  ┌─────────────────────────────┐              │
│ │  │ Status │ Name               │              │
│ │  ├─────────────────────────────┤              │
│ │  │ 429    │ Rate Limit Exceeded│              │
│ │  │ 503    │ Service Unavailable│              │
│ │  │ 0      │ Network Error      │              │
│ │  └─────────────────────────────┘              │
│ │  [+ Add Custom]                               │
│ └─                                              │
│                                                  │
│ About:                                           │
│ ├─ Version: 0.1.0                               │
│ ├─ Last updated: 2026-06-12                     │
│ ├─ [Check for updates]                          │
│ ├─ [Report issue]                               │
│ └─ [View documentation]                         │
│                                                  │
│ Data:                                            │
│ └─ [Export All] [Import] [Clear All Data]       │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Dark Mode Appearance

All views above adapt to dark mode automatically. Example:

```
Dark Mode (Same layout, different colors):

Background:     #1F2937 (instead of #F1F4F8)
Cards:          #2D3748 (instead of #FFFFFF)
Text:           #F3F4F6 (instead of #111827)
Accent:         #5B9FFF (instead of #2F6DC4)
Success:        #34D399 (instead of #10B981)
Error:          #F87171 (instead of #EF4444)
Borders:        #374151 (instead of #E5E7EB)

Example card in dark mode:
┌─────────────────────────────────────┐  ← #2D3748 bg, #374151 border
│ Redirect /admin                     │  ← #F3F4F6 text
│ Type: rewrite-url | ✓ Enabled       │
│ Priority: 5                         │
│ [Edit] [✓] [×]                     │  ← Buttons adapt to dark
└─────────────────────────────────────┘
```

---

## Mobile-Responsive Considerations (Future)

Tablet layout (768–1024px):
- Sidebar collapses to icon-only navigation
- Content expands to full width
- Toolbar labels hide, show on hover

Mobile layout (< 768px):
- Full-screen modal per view (not sidepanel)
- Bottom navigation tabs
- Touch-friendly buttons (44px min height)
- Stack cards vertically

---

## Accessibility Features

Throughout all views:

1. **Keyboard Navigation**:
   - `Tab` → move between interactive elements
   - `Shift+Tab` → move backward
   - `Enter` / `Space` → activate buttons/toggles
   - `Escape` → close modals
   - `Arrow keys` → select items in lists/dropdowns

2. **Screen Reader Support**:
   - All buttons, inputs, cards have ARIA labels
   - Form labels associated with inputs
   - Status changes announced (e.g., "3 conflicts detected")
   - Complex widgets (table, accordion) have ARIA roles

3. **Visual Clarity**:
   - All text ≥ 4.5:1 contrast ratio (normal), ≥ 3:1 (UI components)
   - Focus ring always visible (blue 2px outline)
   - Icons paired with text labels
   - No color as sole indicator (status also shown with icons/text)

---

## Performance Optimizations

1. **Virtualized Lists**: For 1000+ requests/rules, only render visible rows
2. **Code Splitting**: Load feature views on demand (lazy import)
3. **CSS-in-JS Minimal**: Use CSS custom properties, keep CSS < 30KB gzipped
4. **Image/SVG Optimization**: All icons as optimized SVGs, no raster images

---

## Next Steps

1. **FE-0**: Finalize design tokens in Figma or CSS, document in DESIGN_SYSTEM.md ✓
2. **FE-1**: Implement base components in isolation (Storybook-first)
3. **FE-2**: Build feature layouts with mock data
4. **FE-3**: Implement dark mode toggle + theme persistence
5. **FE-4–6**: Polish, accessibility audit, desktop/responsive, docs

All components remain agnóstic until backend features are ready. No blocking.
