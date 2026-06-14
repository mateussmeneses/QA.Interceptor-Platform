# ADR-005: Pure Function Modules for Testability
<!-- markdownlint-disable MD040 -->

**Status**: Accepted  
**Date**: 2026-06-12  
**Author**: Architect Agent

---

## Context

Browser extension code often mixes side-effectful I/O (chrome APIs, DOM manipulation) with business logic (data transformation, validation, formatting). This mixture makes unit testing impractical — testing requires either a full browser or extensive mocking of global APIs.

The key insight: **most of the logic that matters most has no intrinsic need for I/O**. Parsing storage data, formatting evidence reports, building HAR objects, evaluating assertions, diffing responses — these are pure transformations.

---

## Decision

Apply the **Functional Core, Imperative Shell** pattern throughout the codebase:

```
┌─────────────────────────────────────────┐
│  Imperative Shell (hard to test)        │
│  chrome.storage, DOM, chrome.runtime    │
│  → Thin adapters only, no logic         │
└───────────────┬─────────────────────────┘
                │ calls pure functions
┌───────────────▼─────────────────────────┐
│  Functional Core (easy to test)         │
│  packages/rule-engine/**                │
│  extension/src/sidepanel/shared/utils.ts│
│  → Deterministic, no side effects       │
└─────────────────────────────────────────┘
```

**Rules**:

1. **A function is pure if**: same inputs always produce same outputs; no observable side effects.
2. **Extraction rule**: if a function can be made pure by passing its dependencies as arguments, extract it to `shared/utils.ts` or `rule-engine/src/`.
3. **Test rule**: every pure function that performs non-trivial logic must have unit tests.
4. **Naming convention**: pure modules in `shared/utils.ts` carry no `Async` suffix and do not return Promises unless the async operation is itself pure (e.g., JSON parsing a string).

**Concrete examples**:

- `buildEvidenceJson(session, assertions)` → pure (no chrome API, no DOM)
- `diffText(left, right)` → pure (LCS algorithm, deterministic)
- `detectConflicts(rules)` → pure (rule analysis, no state mutation)
- `evaluateAssertions(assertions, response)` → pure (evaluation logic)
- `saveCapturedRequests(rows)` → **impure** (chrome.storage) — stays in the imperative shell

---

## Consequences

**Positive**:

- Unit tests run in < 400ms with Vitest, no browser needed.
- Pure functions are composable — build more complex logic from simpler parts.
- Side effects are centralized (storage layer, message handlers) — easy to audit.
- New contributors can test their logic locally without setting up a browser extension environment.

**Negative / Trade-offs**:

- Passing dependencies as arguments can make function signatures verbose for deeply nested logic.
- Requires discipline to resist "just calling chrome.storage here" when it would be faster.

**Enforcement**:

- `packages/rule-engine` TypeScript config excludes browser lib types — any chrome/DOM call is a compile error.
- Code review checklist: does this new logic depend on I/O? If no, it belongs in a pure module.
