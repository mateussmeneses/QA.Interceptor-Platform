# Frontend Integration Strategy — Agnóstic to Backend

> This document explains how the frontend components remain agnóstic during development, then seamlessly integrate with backend features when ready.

---

## Core Principle: Props-Based Data Contracts

All components accept data via **TypeScript props**. They never know or care where the data comes from.

### Example: Rule Card Component

**Today (Development Phase)**:

```tsx
// MockData approach — no backend needed
<RuleCard
  rule={{
    id: "rule-1",
    name: "Redirect /admin",
    type: "rewrite-url",
    enabled: true,
    priority: 5,
    condition: { urlContains: "/admin", method: "GET" },
    payload: { redirectTo: "https://example.com/dashboard" }
  }}
  onEdit={(rule) => console.log("Edit", rule)}
  onDelete={(id) => console.log("Delete", id)}
/>
```

**Tomorrow (After Backend Features Implement)**:

```tsx
// Real data from evaluateRules + chrome.storage
const rules = await loadRules(); // from rule-engine package
rules.forEach((rule) => (
  <RuleCard
    rule={rule}
    onEdit={(updatedRule) => saveRule(updatedRule)}
    onDelete={(id) => deleteRule(id)}
  />
));
```

**The component code is identical in both cases.** Only the data source changes.

---

## Data Flow Architecture

### Current (Dev): Mock Data via Storybook

```
┌──────────────────┐
│ Storybook        │
│ (Mock data)      │
└────────┬─────────┘
         │ props
         ▼
┌──────────────────┐
│ Component        │  ← Renders, no backend needed
│ (e.g., RuleCard) │
└────────┬─────────┘
         │
         ▼
    Browser
```

### Future (Integration): Real Data from Backend

```
┌──────────────────┐
│ Extension        │
│ Background       │
│ Script / Proxy   │
└────────┬─────────┘
         │
         ├─→ rule-engine ─┐
         │  (evaluateRules)│
         │                 │
         ├─→ chrome.storage─→ loadRules()
         │
         ▼
   ┌──────────────────┐
   │ Feature Module   │
   │ (e.g., rules.ts) │  ← Orchestrates data
   └────────┬─────────┘
            │ props + data
            ▼
   ┌──────────────────┐
   │ Component        │  ← Renders with real data
   │ (e.g., RuleCard) │
   └──────────────────┘
```

---

## Feature Module Template (Agnóstic)

All feature modules follow this pattern:

```typescript
// features/rules.ts

import { Rule } from "@qa-interceptor/shared-types";
import { RuleCard, RulesList } from "../components/rules";

export interface RulesState {
  rules: Rule[];
  selectedRuleId?: string;
  isLoading: boolean;
  error?: string;
}

export interface RulesActions {
  onAddRule: () => void;
  onEditRule: (rule: Rule) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  onSearch: (query: string) => void;
}

export const initRulesFeature = (): RulesState => ({
  rules: [], // Initially empty
  isLoading: false,
});

export const renderRulesFeature = (
  state: RulesState,
  actions: RulesActions
) => {
  return (
    <section className="rules-workspace">
      <header className="rules-header">
        <h2>Rules Workspace</h2>
        <span className="badge">{state.rules.filter((r) => r.enabled).length} enabled</span>
      </header>

      {state.isLoading && <Spinner />}
      {state.error && <ErrorBanner message={state.error} />}

      <input
        type="search"
        placeholder="Search rules…"
        onChange={(e) => actions.onSearch(e.target.value)}
      />
      <button onClick={actions.onAddRule}>+ Add Rule</button>

      <RulesList
        rules={state.rules}
        onEdit={actions.onEditRule}
        onDelete={actions.onDeleteRule}
        onToggle={actions.onToggleRule}
      />
    </section>
  );
};
```

**Key observations**:

1. **No direct chrome.storage calls** — data is passed in
2. **No hardcoded mocks** — state is a prop
3. **Actions are callbacks** — implementation is flexible
4. **Components are pure** — same render given same props

### Later: Wire to Backend

```typescript
// features/rules.ts (AFTER backend ready)

// Import actual implementations
import { loadRules, saveRule, deleteRule } from "../storage";
import { evaluateRules } from "@qa-interceptor/rule-engine";
import { detectConflicts } from "@qa-interceptor/rule-engine";

let state: RulesState = { rules: [], isLoading: false };

// On init, load real rules
export const initRulesFeature = async (): Promise<RulesState> => {
  state.isLoading = true;
  try {
    state.rules = await loadRules();
    state.isLoading = false;
  } catch (err) {
    state.error = (err as Error).message;
  }
  return state;
};

// Actions now call backend
const actions: RulesActions = {
  onAddRule: async () => {
    const newRule: Rule = {
      /* form data */
    };
    await saveRule(newRule);
    state.rules = await loadRules(); // Refresh
    render(); // Re-render with new data
  },
  onDeleteRule: async (id) => {
    await deleteRule(id);
    state.rules = await loadRules();
    render();
  }
  // … etc
};

// render() calls renderRulesFeature(state, actions)
const render = () => {
  const html = renderRulesFeature(state, actions);
  updateDOM(html);
};
```

**The component code never changes.** Only the state and actions.

---

## Data Contracts (TypeScript Interfaces)

All feature modules export contracts that define their data shape:

```typescript
// features/index.ts

export interface AppState {
  rules: Rule[];
  capturedRequests: InterceptedRequest[];
  capturedResponses: InterceptedResponse[];
  mocks: ConditionalMockRule[];
  sessions: Session[];
  settings: UserSettings;
  ui: {
    activeView: "rules" | "network" | "mocks" | "history" | "settings";
    selectedRuleId?: string;
    selectedRequestId?: string;
  };
}

export interface AppActions {
  // Rules
  loadRules: () => Promise<void>;
  saveRule: (rule: Rule) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;

  // Network
  captureRequest: (request: InterceptedRequest) => void;
  captureResponse: (response: InterceptedResponse) => void;

  // Mocks
  evaluateMock: (rule: ConditionalMockRule, context: MockCallContext) => Promise<void>;

  // Navigation
  setActiveView: (view: AppState["ui"]["activeView"]) => void;
  selectRule: (id: string) => void;
}
```

**Any developer can implement these interfaces.** Frontend doesn't care about implementation.

---

## Component Storybook (Development-Focused)

During development, components are tested in isolation with mock data:

```typescript
// Button.stories.tsx

import { Button } from "./Button";

export default { component: Button };

export const Primary = () => (
  <Button variant="primary" onClick={() => alert("Clicked!")}>
    Add Rule
  </Button>
);

export const Disabled = () => (
  <Button variant="primary" disabled>
    Add Rule
  </Button>
);

export const Loading = () => (
  <Button variant="primary" isLoading>
    Saving…
  </Button>
);
```

**Benefits**:

- No chrome extension needed
- No backend needed
- Fast iteration
- No state management overhead
- Each component in isolation

### Run Storybook without Extension

```bash
npm run storybook
# Opens on http://localhost:6006
# All components visible with mock data
# No dependencies on chrome.storage or rule-engine
```

---

## State Management Strategy (Agnóstic)

Avoid committing to a single state library. Use a **generic store interface**:

```typescript
// store/index.ts

export interface Store {
  getState(): AppState;
  setState(partial: Partial<AppState>): void;
  subscribe(listener: (state: AppState) => void): () => void;
}

// Can be implemented with Redux, Zustand, Jotai, or vanilla
export const createStore = (): Store => {
  let state: AppState = initState();
  let listeners: Array<(state: AppState) => void> = [];

  return {
    getState: () => state,
    setState: (partial) => {
      state = { ...state, ...partial };
      listeners.forEach((l) => l(state));
    },
    subscribe: (listener) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    }
  };
};
```

**Advantage**: Swap implementations without touching components.

---

## Integration Checklist

When a backend feature is ready:

### 1. Data Source (Storage)

- [ ] `loadXxx()` function exports from `rule-engine/storage-parsers.ts`
- [ ] `saveXxx()` function integrates with `chrome.storage`
- [ ] Data shape matches `@qa-interceptor/shared-types`

### 2. Business Logic (Rule Engine)

- [ ] `evaluateXxx()` function in `rule-engine/src/`
- [ ] Fully unit-tested
- [ ] Exported from `@qa-interceptor/rule-engine`

### 3. Feature Module (Orchestration)

- [ ] `features/xxx.ts` updated with real `onXxx()` implementations
- [ ] Calls backend functions instead of mock data
- [ ] Error handling (try/catch, user feedback)

### 4. UI Integration

- [ ] Feature module passes real data to components
- [ ] Components unchanged (props-based)
- [ ] Test with real data in browser

### 5. Cleanup

- [ ] Remove mock data
- [ ] Remove Storybook stories (or keep for documentation)
- [ ] Update README/docs with real flow

---

## Example: Wiring the Rules Feature

### Phase 1 (Today): Mock-Only

```typescript
// features/rules.ts
export const initRulesFeature = (): RulesState => ({
  rules: [
    {
      id: "mock-1",
      name: "Redirect /admin",
      type: "rewrite-url",
      enabled: true,
      priority: 5,
      condition: { urlContains: "/admin" },
      payload: { redirectTo: "/dashboard" },
      createdAt: new Date().toISOString()
    }
  ],
  isLoading: false
});

const actions: RulesActions = {
  onAddRule: () => {
    console.log("Add rule (not implemented yet)");
  }
  // … other mock actions
};
```

**Status**: ✓ Component renders, ✓ Layout looks good, ✓ No backend needed.

### Phase 2 (After Backend Ready): Real Data

```typescript
// features/rules.ts
import { loadRules, saveRule, deleteRule } from "../storage";

export const initRulesFeature = async (): Promise<RulesState> => {
  const rules = await loadRules(); // ← Now calls real backend
  return { rules, isLoading: false };
};

const actions: RulesActions = {
  onAddRule: async () => {
    const newRule = {
      /* from form */
    };
    await saveRule(newRule); // ← Persists to chrome.storage
    const rules = await loadRules();
    render({ rules });
  },
  onDeleteRule: async (id) => {
    await deleteRule(id); // ← Deletes from storage
    const rules = await loadRules();
    render({ rules });
  }
};
```

**Status**: ✓ Same component renders, ✓ Real data flows through, ✓ Feature complete.

---

## Benefits of This Approach

| Benefit                 | How It Works                                                                 |
| ----------------------- | ---------------------------------------------------------------------------- |
| **No Blocking**         | Frontend can build while backend features are implemented.                   |
| **Testable Components** | Storybook + mock data; no chrome/backend needed.                             |
| **Fast Iteration**      | Change UI without touching backend logic.                                    |
| **Clear Contracts**     | TypeScript interfaces define expectations; implementation is flexible.       |
| **Gradual Integration** | Wire one feature at a time; don't wait for all features to be ready.         |
| **Easy Debugging**      | Mock data makes it obvious when data flow is wrong; backend issues isolated. |
| **Reusability**         | Components can be used in web app or desktop app without changes.            |

---

## Timeline

- **Week 1–2 (FE-0/FE-1)**: Build components with mock data in Storybook
- **Week 2–3 (FE-2)**: Build feature layouts (Rules, Network, Mocks, etc.) with mock data
- **Week 3–4 (Parallel)**: Backend team implements rule evaluation, storage, etc.
- **Week 4–5**: Integrate backend features into feature modules (swap mock actions for real)
- **Week 5–6 (FE-3)**: Polish, dark mode, animations
- **Week 6+ (FE-4–6)**: Desktop, responsive, accessibility, docs

**Frontend and backend teams work in parallel with zero blocking.**
