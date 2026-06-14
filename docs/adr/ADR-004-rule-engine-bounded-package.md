# ADR-004: Rule Engine as a Bounded Package

**Status**: Accepted  
**Date**: 2026-06-12  
**Author**: Architect Agent

---

## Context

The rule evaluation logic — matching conditions, applying transformations, validating schemas, evaluating assertions, diffing contracts — is the core algorithmic heart of the platform. Placing it inside the extension creates several problems:

- **Portability**: A future desktop proxy (Phase 4) also needs rule evaluation. Duplicating the code breaks the single-source-of-truth principle.
- **Testability**: Extension code runs in a browser environment. Pure algorithmic code should be testable with a plain Node.js runner (Vitest).
- **Versioning**: The rule engine has its own semantic versioning lifecycle, independent of UI changes.
- **Coupling**: Putting business logic next to UI code invites accidental DOM/chrome dependencies.

---

## Decision

The rule engine lives in `packages/rule-engine/` as a standalone npm workspace package (`@qa-interceptor/rule-engine`).

**Invariants for all code in this package**:

1. **Zero browser API dependencies** — no `chrome`, no `window`, no `document`.
2. **Zero DOM dependencies** — no `HTMLElement`, no `querySelector`.
3. **Pure functions only** — all exported functions are deterministic given the same inputs.
4. **Self-contained types** — imports from `@qa-interceptor/shared-types` only; no circular deps.
5. **Test coverage required** — new modules must include tests. No untested business logic.

**Modules currently in package**:

| Module                   | Responsibility                              |
| ------------------------ | ------------------------------------------- |
| `index.ts`               | `evaluateRules` — rule matching engine      |
| `assertion-evaluator.ts` | Response assertion evaluation               |
| `schema-validator.ts`    | JSON Schema draft-07 subset                 |
| `contract-comparator.ts` | Structural diff for contract drift          |
| `storage-parsers.ts`     | Pure parse functions for typed storage      |
| `diff-engine.ts`         | LCS-based line diff for response comparison |
| `conflict-detector.ts`   | Rule conflict analysis                      |

**The extension imports from `packages/rule-engine/src/` directly** (via TypeScript `paths` alias) to avoid a double-build step during development. The production build compiles both packages independently.

---

## Consequences

**Positive**:

- Phase 4 desktop proxy reuses the same rule engine with zero changes.
- 343+ unit tests run in < 400ms with Vitest (no browser launch overhead).
- Clear architectural boundary: any business logic that doesn't require a browser belongs here.
- Future: can be published to npm for community consumption.

**Negative / Trade-offs**:

- Two `tsconfig.json` files to maintain (package + extension).
- `paths` alias in `extension/tsconfig.json` must be kept in sync with actual source paths.
- Cannot import browser extension types from this package.

**Guard rails**:

- If a new file in this package tries to import from `chrome` or `window`, CI type-check will fail.
- The package has its own `package.json` and build step — treat it as an external dependency boundary.
