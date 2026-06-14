# ADR-002: Centralized Storage Abstraction Layer

<!-- markdownlint-disable MD040 -->

**Status**: Accepted  
**Date**: 2026-06-12  
**Author**: Architect Agent

---

## Context

`chrome.storage.local` is a browser-specific API with an untyped callback/promise interface. Without an abstraction, every feature module would:

- Repeat the same key string literals (`"rules"`, `"capturedRequests"`, etc.).
- Perform its own type coercion from `unknown` to a domain type.
- Be coupled to `chrome.storage` directly, making testing and future migration difficult.
- Risk inconsistency — two modules could interpret the same key with different shapes.

---

## Decision

All `chrome.storage.local` access must go through `extension/src/storage/index.ts`.

**Contract**:

```
storage/index.ts
├── STORAGE_KEYS (const enum of all keys)
├── StoredXxx types (shapes for each stored value)
├── loadXxx() → Promise<T>   (typed reader per domain)
└── saveXxx(value: T) → Promise<void>   (typed writer per domain)
```

**Constraints enforced by architecture**:

1. No feature module or background script may call `chrome.storage` directly.
2. Parse functions (`parseRules`, `parseCapturedRequests`, …) and their type guards live in
   `extension/src/storage/index.ts` as a single source of truth.
3. All loaded data is validated through parse functions before returning typed values.
4. Default values for empty/missing keys are defined here, not at call sites.

---

## Amendment (2026-06-14)

- Constraint #2 originally placed the parse functions in `packages/rule-engine/src/storage-parsers.ts`.
  That copy diverged from the real runtime parsers and was removed (TD-010). The parsers now live
  only in `extension/src/storage/index.ts`, which is the single source.
- An injectable `StorageAdapter` interface (`extension/src/storage/adapter.ts`) was prototyped for a
  future Electron/Phase 4 backend but never wired to any consumer. It was removed (TD-014) under
  YAGNI; reintroduce it with real consumers when Phase 4 begins.
- The accepted decision (centralized `storage/index.ts` with `STORAGE_KEYS` + typed `loadXxx`/`saveXxx`)
  remains in force and fully implemented.

---

## Consequences

**Positive**:

- Single source of truth for key names, shapes, and defaults.
- Parse functions are unit-tested (50 tests) without a browser.
- Migration to a different storage backend (IndexedDB, Node.js fs) requires changing only this file.
- Type errors at call sites surface immediately — no `unknown` escaping to features.

**Negative / Trade-offs**:

- Adds one indirection layer. Direct `chrome.storage` calls are 3-4 lines; abstracted calls are 1 line but require a function for each key.
- All domain types must be declared in `StoredXxx` — new keys require updating this file.

**When to extend**:

- Adding a new persisted domain → add `STORAGE_KEYS.MY_KEY`, `StoredMyType`, `loadMyType`, `saveMyType`, and a matching `parseMyType` in `storage-parsers.ts`.
- Never inline `chrome.storage` calls outside this module.
