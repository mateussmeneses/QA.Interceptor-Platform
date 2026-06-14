# BACKLOG_CONSOLIDATED — QA.Interceptor Platform

> **The project's only official backlog.** It replaces and supersedes all other backlogs.
> The files `docs/_archive/backlog/BACKLOG_CANONICAL.md`, `BACKLOG.md`, `BACKLOG_EXPANDED.md`, and
> `BACKLOG_FRONTEND.md` are **read-only history** (catalogs), not official status.
> Before working, also read `PROJECT_STATE.md` and `AI_DEVELOPMENT_RULES.md`.

**Last consolidation:** 2026-06-13 (9-phase audit; status validated by code + build + 579 tests)

## Status policy

- **Done**: implemented AND running at runtime, with green build + test/typecheck.
- **Engine ready / not wired**: pure logic implemented and tested, but not executing in the extension.
- **In Progress**: partial implementation, skeleton, or lacking acceptance depth.
- **Todo**: not implemented.

## Phase taxonomy (single)

`Phase 1` extension MVP · `Phase 2` advanced tools · `Phase 3` QA platform ·
`Future Backlog` desktop proxy / team / AI / security. Old schemes (3.5, 3.6, FE-x) are retired.

---

## P0 — Immediate (stabilization and runtime truth)

| ID           | Title                                                                             | Status   | Why now                                                                      |
| ------------ | --------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| INT-004      | Unify `matchesCondition` (fix case-sensitive vs insensitive)                      | **Done** | Engine unified + case-insensitive; new test (579 tests)                      |
| FIX-001      | Resolve phantom `validate-schema` (implement via schema-validator OR remove type) | **Done** | Phantom type removed from `RuleType`; to be reintroduced in INT-001          |
| FIX-002      | Guard empty `condition.urlContains` in `buildDynamicRules`                        | **Done** | Already protected by early-return; no path to invalid regex                  |
| ARCH-DEC-001 | Runtime UI decision (plain TS vs React)                                           | **Done** | Decided: plain TS. React removed on 2026-06-13                               |
| QA-ARCH-001  | Remove orphan React subtree                                                       | **Done** | ~3,300 lines removed; full `tsc` now passes                                  |
| QA-BUILD-001 | Full extension typecheck must pass                                                | **Done** | `tsc -p tsconfig.json` green after removal                                   |
| QA-DOC-001   | Consolidate/archive obsolete status docs                                          | **Done** | Legacy analysis/planning/backlogs moved to `docs/_archive/`; INDEX rewritten |
| CAP-004      | Method-only rule (no urlContains) is ignored by DNR                               | Todo     | Limitation found during FIX-002; needs a semantics decision                  |

## P1 — Wiring ready engines (high value, low cost)

> Engines already implemented and tested; only runtime wiring is missing. **Do not recreate.**

| ID       | Title                                                                | Status   | Source engine                                                                                              |
| -------- | -------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| INT-001  | Wire JSON Schema validation to runtime (`json-schema` assertion)     | **Done** | `schema-validator.ts` → `assertion-evaluator`; auto-evaluates in `network.ts`; +11 tests                   |
| INT-002  | Wire contract snapshot comparison to the UI                          | **Done** | `contract-comparator.ts` wired into network diff compare (structural breaking-change list)                 |
| INT-003  | Wire conflict detector to the network view (replace inline counting) | **Done** | `conflict-detector.ts` wired in `network.ts`; inline `typeCounts` removed (4 conflict kinds + suggestions) |
| INT-005  | Wire conditional mock evaluator to the mock-bridge                   | **Done** | Sequence mocks: storage model + UI (Mocks view) + `evaluateConditionalMock` in mock-bridge (in-page state) |
| INT-006  | Wire schema inference (auto-generate schema from traffic)            | **Done** | `schema-inference.ts` wired: "Infer JSON schema" button on response body in `network.ts`                   |
| TECH-001 | Decide rule engine: migrate background to `rule-index` OR remove it  | **Done** | Removed `rule-index.ts` (concurrent engine, unused); `matchesCondition` canonical in `index.ts`            |

## P1 — Reporting & Observability (partials to complete)

| ID      | Title                               | Status      | Notes                                                                                        |
| ------- | ----------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| QP-006  | Evidence HTML export (professional) | **Done**    | Self-contained report: KPI cards, status bars, assertion table, traffic waterfall, printable |
| QP-007  | Complete replay/playback UI         | In Progress | Missing timeline scrubber/controls                                                           |
| QP-008  | Save session as replayable artifact | Todo        | No dedicated offline artifact                                                                |
| OBS-001 | Request/response diff (final UX)    | In Progress | Functional diff via `diffText`                                                               |
| OBS-002 | Request waterfall (advanced)        | Todo        | Basic bars today                                                                             |
| OBS-003 | Request size analysis               | Todo        | —                                                                                            |
| OBS-004 | Execution trace visualizer          | In Progress | Now uses `detectConflicts` (INT-003); 4 conflict kinds shown                                 |
| OBS-006 | Baseline capture and comparison     | Todo        | —                                                                                            |
| OBS-007 | Regression report generator         | Todo        | —                                                                                            |

## P1 — Interception coverage (platform limitations)

| ID      | Title                                      | Status   | Notes                                                                                    |
| ------- | ------------------------------------------ | -------- | ---------------------------------------------------------------------------------------- |
| CAP-002 | Intercept `XMLHttpRequest` besides `fetch` | **Done** | XHR open/send patched in mock-bridge; conditional + static mocks + delay now work on XHR |
| CAP-003 | Evaluate WebSocket capture                 | Todo     | Out of current scope                                                                     |

## P2 — Performance & Analysis

| ID       | Title                     | Status |
| -------- | ------------------------- | ------ |
| OBS-008  | Traffic anomaly detection | Todo   |
| PERF-001 | Bottleneck detection      | Todo   |
| PERF-002 | Request timing breakdown  | Todo   |
| PERF-003 | Bandwidth profiler        | Todo   |

## Governance / Quality

| ID            | Title                                                      | Status   | Notes                                                                                             |
| ------------- | ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| QA-DOC-002    | Repair broken markdown links + link-check CI               | Todo     | —                                                                                                 |
| QA-CSS-001    | Class-by-class cleanup of orphan `styles/components/*.css` | **Done** | Removed 20 orphan component CSS (exact-token audit); kept `diff-viewer.css` + `modal.css`         |
| QA-TEST-001   | Define a test strategy for the plain-TS UI                 | Todo     | `.tsx` tests were removed with the subtree                                                        |
| QA-FMT-001    | Repo-wide Prettier formatting + green `format:check`       | **Done** | `npm run format` applied; `format:check` green                                                    |
| UI-ASSERT-001 | Assertion creation UI for typed assertions                 | **Done** | Type select + expected/path fields wired in `settings.ts`; unlocks INT-001 end-to-end             |
| TD-010        | Deduplicate storage parsers                                | **Done** | Removed stale `rule-engine/storage-parsers.ts` (+tests); `storage/index.ts` is single source      |
| TD-011        | Dedupe content-script types/guards (D-04/D-05/D-07)        | **Done** | Shared `rule-engine/content-guards.ts` used by injector + mock-bridge; +14 tests                  |
| TD-016        | Centralize rule-type label/action catalog (D-10)           | **Done** | `RULE_TYPE_CATALOG` in `shared/utils.ts`; `network.ts` consumes `summarizeRuleAction`             |
| TD-014        | Decide `storage/adapter.ts` (adopt for Phase 4 or remove)  | **Done** | Removed orphan injectable adapter (YAGNI); ADR-002 amended. Reintroduce with consumers in Phase 4 |

---

## Future Backlog (do not start without reprioritization)

- **Desktop proxy (Electron):** P4-001..P4-020 — see `docs/_archive/backlog/BACKLOG_EXPANDED.md` (historical catalog).
- **Team & Enterprise:** P5-001..P5-010.
- **AI & Advanced:** AI-002..AI-006, MOCK-002..004, SEC-001..004.

---

## Completed and verified items (evidence in code)

| ID           | Title                                                          | Evidence                                                               |
| ------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Phase 1 MVP  | Capture, DNR rules, fetch mocks, rewrite, block/delay/redirect | `background/index.ts`, `mock-bridge.ts`                                |
| RW-001..005  | Rewrites url/header/query/request-body/response-body           | `background/index.ts`, `mock-bridge.ts`                                |
| MK-001..002  | Mock response + status                                         | `mock-bridge.ts`                                                       |
| NS-001..003  | Block / delay / redirect                                       | `background/index.ts`, `mock-bridge.ts`                                |
| NET-001..008 | Clear/HAR/cURL/repeat/compose/clone/edit-resend                | `features/network.ts`, `background/index.ts`                           |
| MK-003       | Dynamic variables in templates                                 | `mock-bridge.ts` (`applyDynamicVariables`)                             |
| RQ-001..002  | Rule groups CRUD + enable/ordering                             | `features/rules.ts`, `background/index.ts`                             |
| QP-001       | Assertion evaluation pipeline                                  | `evaluateAssertions` in `features/network.ts`                          |
| QP-004/005   | Evidence export JSON/Markdown                                  | `shared/utils.ts`, `features/history.ts`                               |
| ARC-001..003 | Feature modules + typed messages + storage layer               | `sidepanel/features/*`, `shared-types/messages.ts`, `storage/index.ts` |
| TEST         | Rule-engine suite                                              | **548 tests / 19 files** green (vitest)                                |

> **Historical correction:** old test counts ("26", "198/469") are **false**.
> The current validated number is **548** (after removing stale duplicates and adding content-guards tests).
>
> **Note on engines:** all 6 rule-engine modules are now resolved. QP-002 (schema-validator) via INT-001;
> OBS-005 (conflict-detector) via INT-003; QP-003 (contract-comparator) via INT-002; AI-001 (schema-inference)
> via INT-006; MOCK-001 (conditional-mock) via INT-005; `rule-index.ts` removed (TECH-001).
