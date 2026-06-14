# ADR-001: Feature-Based Module Architecture for Sidepanel
<!-- markdownlint-disable MD040 -->

**Status**: Accepted  
**Date**: 2026-06-12  
**Author**: Architect Agent

---

## Context

The sidepanel entry point (`main.ts`) grew to ~2,844 lines as features were added incrementally. A single monolithic file creates several problems:

- **Coupling**: Unrelated concerns (rules UI, network inspector, mocks, history, settings) share mutable state and DOM selectors, making isolated changes risky.
- **Testability**: DOM-interleaved business logic is hard to unit test without a browser environment.
- **Ownership**: No clear boundary for future contributors to understand where to make changes.
- **Merge conflicts**: Every PR touches the same file, regardless of feature area.

---

## Decision

Decompose the sidepanel into **feature modules** with a thin orchestrator:

```
extension/src/sidepanel/
├── main.ts               ← orchestrator only (~70 lines)
├── index.html
├── styles.css
├── features/
│   ├── rules.ts          ← Rule CRUD, groups, import/export
│   ├── network.ts        ← Inspector, compose, diff, assertions
│   ├── mocks.ts          ← Mock playground, templates, env vars
│   ├── history.ts        ← Sessions, evidence export, replay
│   ├── settings.ts       ← Assertions, error profiles, preferences
│   └── navigation.ts     ← View routing
└── shared/
    ├── types.ts          ← View-model types (no runtime imports)
    └── utils.ts          ← Pure utility functions
```

**Rules for each feature module**:

1. Each module exports exactly two functions: `init{Feature}()` and `render{Feature}(state: AppState)`.
2. Each module owns its own DOM references as private module-level variables.
3. Cross-module communication only via `AppState` — no direct calls between feature modules.
4. All pure logic lives in `shared/utils.ts`; no DOM access in pure functions.

---

## Consequences

**Positive**:

- Files are bounded to one concern. Easier to navigate, review, and reason about.
- Pure functions in `shared/utils.ts` are fully unit-testable without a browser.
- `main.ts` reduced from 2,844 lines to ~70 lines (orchestrator).
- New features can be added as new modules without touching existing ones.

**Negative / Trade-offs**:

- Slight boilerplate: every feature must re-query DOM elements in `init{}()`.
- `AppState` is passed on every render cycle — shallow for now, but could grow.

**Mitigation**:

- Keep `AppState` lean. New state belongs in `AppState` only if ≥ 2 feature modules need it.
- If `AppState` grows beyond 8 fields, introduce a state slice pattern.
