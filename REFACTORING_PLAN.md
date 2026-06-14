# Refactoring Plan

## Objective

Transform the repository into a clean, maintainable, and predictable codebase with one reliable backlog and one coherent runtime architecture.

## Current State Snapshot (updated 2026-06-13)

- What exists: solid rule-engine (578 tests) + extension runtime baseline + extensive docs.
- What works: extension build, full typecheck, rule-engine tests, core capture/rules/mocks/assertions.
- What was removed: the parallel React component subtree (~3,300 dead lines) — done.
- What does not fully work: 6 engines implemented but not wired (INT-001..006); reporting/observability partial.
- What is incomplete: QP-006/007/008, OBS-001/004/006/007 are preview/skeleton or partial.
- Known bugs: matchesCondition case divergence (INT-004), validate-schema phantom (FIX-001),
  empty urlContains DNR regex (FIX-002).

## Removal Plan (Safe-first)

| Action                                                             | Reason                                   | Impact                             | Status               |
| ------------------------------------------------------------------ | ---------------------------------------- | ---------------------------------- | -------------------- |
| Remove full React subtree (components/\*.tsx + **tests** + barrel) | Orphan, uncompilable, dead               | -3,300 lines; green full typecheck | **DONE 2026-06-13**  |
| Archive stale status docs into docs/\_archive                      | Remove contradictory status sources      | Improves planning reliability      | Pending (QA-DOC-001) |
| Clean orphan component CSS class-by-class                          | Styled dead `.tsx`; `modal.css` is mixed | Smaller CSS surface                | Pending (QA-CSS-001) |
| Repair broken cross-doc links                                      | Restore docs operability                 | Better onboarding                  | Pending (QA-DOC-002) |
| Decide `storage/adapter.ts`: adopt or remove                       | Orphan abstraction                       | Simplification                     | Pending (TD-003)     |

## Correction Plan

### 1) Build and Quality Corrections

1. Add explicit typecheck scripts:

   - Runtime scope typecheck (must pass)
   - Optional component-lab typecheck (if retained)

2. Add markdown link validation script in CI
3. Keep build pipeline aligned with modular sidepanel styles

### 2) Backlog and Governance Corrections

1. Use BACKLOG_CONSOLIDATED.md as execution board
2. Keep docs/backlog/BACKLOG_CANONICAL.md as evidence registry
3. Demote remaining backlog/planning docs to reference-only

### 3) Runtime Functional Corrections

1. Finish QP-006 (HTML evidence report depth)
2. Finish QP-007 (full replay player semantics)
3. Implement QP-008 and OBS-006/OBS-007 end-to-end
4. Reclassify all preview controls by real capability state

## Rewrite Plan (if architecture decision selects React runtime)

1. Migrate one feature at a time (Rules -> Network -> Mocks -> History -> Settings)
2. Replace plain feature renderers with React containers
3. Remove duplicated plain TS feature rendering after each migration

## Rewrite Plan (if architecture decision selects plain TS runtime)

1. Move React subtree to separate package prototype (non-runtime)
2. Keep sidepanel runtime as single source
3. Remove React artifacts from extension package scope

## Implementation Plan by Waves

### Wave 0 - Governance Freeze (1-2 days)

- Freeze status edits outside canonical/consolidated files
- Communicate done criteria and evidence policy

### Wave 1 - Structural Cleanup (2-4 days)

- Repair docs links
- Archive stale status docs
- Resolve extension typecheck scope mismatch

### Wave 2 - Functional Completion (1-2 weeks)

- QP-006, QP-007 completion
- QP-008 implementation
- OBS-006 and OBS-007 implementation

### Wave 3 - Architecture Convergence (1 week)

- Execute chosen UI-stack decision
- Remove dead/duplicated UI artifacts

### Wave 4 - Hardening (ongoing)

- Add regression tests for evidence export/replay/compare flows
- Enforce CI gates for docs and typecheck

## Next Steps (Execution Order)

1. Approve architecture decision: plain TS runtime or React runtime
2. Execute Wave 0 and Wave 1 immediately
3. Start Wave 2 with QP-006 and QP-008
4. Re-audit backlog status after Wave 2 using evidence policy
