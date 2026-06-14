# Architecture Review

## Architecture Baseline (Declared)

Declared architecture emphasizes:

- Feature-based organization
- Rule-engine core + browser extension runtime
- Clear separation between UI, core, and infrastructure

Primary declaration references:

- docs/architecture/ARCHITECTURE.md
- docs/adr/\*.md

## Architecture Observed (Implemented)

1. Runtime path is HTML + plain TypeScript modules in extension/src/sidepanel/features.
2. Extension interception pipeline is implemented through background + content + page bridge:
   - extension/src/background/index.ts
   - extension/src/content/injector.ts
   - extension/src/content/mock-bridge.ts
3. Pure logic lives in the bounded package packages/rule-engine (578 tests).

## Decision (CLOSED — 2026-06-13)

**Official UI architecture = plain TypeScript + DOM.** The parallel React subtree
(extension/src/sidepanel/components/\*.tsx, ~3,300 lines) was **removed** on 2026-06-13.
It was orphaned (never imported, not bundled, not compilable: no `react` dependency,
no `--jsx`). Removal restored a fully green `tsc -p tsconfig.json`.

## Findings

### A. Dual UI Stack (RESOLVED)

- Was: a React TSX subtree existed in parallel to the plain-TS runtime, duplicating
  responsibility for UI primitives and workflows (~3,300 dead lines).
- Now: removed. Single runtime stack = plain TS. See `PROJECT_STATE.md` §3.
- Residual: `styles/components/*.css` is partially orphaned (styled the dead `.tsx`);
  `modal.css` is mixed (also styles live dialogs). Tracked as QA-CSS-001 / TD-008.

### B. Documentation-Architecture Drift (Major)

- Docs still describe phases and metrics that no longer match code state.
- Broken links across planning/analysis docs create fragmented architecture understanding.

Impact:

- Onboarding friction
- Wrong implementation priorities
- Repeated work and conflicting status updates

Recommendation:

- Treat BACKLOG_CONSOLIDATED.md as the single operative backlog (old backlogs archived under docs/\_archive/)
- Archive stale status docs or update to current numbers

### C. Type System Inconsistency (RESOLVED)

- Was: extension/tsconfig.json had no JSX pipeline, no React deps, yet `.tsx` files
  expected React + JSX → full typecheck failed.
- Now: the TSX subtree was removed; `tsc -p tsconfig.json` passes with no errors.

### D. Concurrent Logic Implementations (Open)

- Two rule engines coexist: `evaluateRules` (used) vs `rule-index.ts` (idle). See TECH-001.
- `matchesCondition` is triplicated with divergent method case handling (a real bug). See INT-004.
- Storage parsers duplicated between `storage/index.ts` (used) and `storage-parsers.ts` (idle).
- Six pure engines (schema-validator, contract-comparator, conflict-detector,
  conditional-mock-evaluator, schema-inference, rule-index) are implemented + tested but
  **not wired to runtime**. Tracked as INT-001..006.

## Recommended Architecture (target)

See `PROJECT_STATE.md` §3 and §5 for the authoritative target structure. Summary:
`shared-types ← rule-engine ← extension`, single rule engine, single storage layer,
shared types (no local copies), pure logic with mandatory tests.

- False confidence about component readiness

Recommendation:

- Either remove/relocate TSX subtree from extension package scope, or configure proper React toolchain in dedicated package

### D. Preview-Heavy UI Surface (Medium)

- Many controls in sidepanel HTML are explicitly preview/skeleton and not fully wired.

Impact:

- User perception of "compiled but not working"

Recommendation:

- Mark incomplete flows in consolidated backlog with explicit acceptance criteria and progress gates

## Duplicate and Orphan Risk Map

| Area                           | Risk                                     | Evidence                                                        | Priority |
| ------------------------------ | ---------------------------------------- | --------------------------------------------------------------- | -------- |
| sidepanel/components (React)   | Potential orphan subtree                 | No runtime imports from sidepanel feature orchestrator          | High     |
| sidepanel/components/**tests** | Unexecutable in current extension config | Type-check failures and missing React libs in extension package | High     |
| planning/status markdown set   | Duplicate stale status                   | Multiple conflicting metrics/dates/status entries               | High     |

## Compliance With DRY/KISS/SOLID

- DRY: violated at UI layer due dual stack implementing same concern.
- KISS: violated by coexistence of runtime stack and parallel non-runtime component stack.
- SOLID: partially respected in feature modules and storage abstraction; weakened at system boundary by inconsistent UI architecture.

## Recommended Target Architecture

1. One runtime UI stack only.
2. One canonical backlog/status stream.
3. One quality gate definition for build/typecheck/test.
4. One documentation index with valid links and current metrics.
