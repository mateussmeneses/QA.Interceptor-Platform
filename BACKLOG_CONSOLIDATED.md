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

| ID           | Title                                                                             | Status   | Why now                                                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INT-004      | Unify `matchesCondition` (fix case-sensitive vs insensitive)                      | **Done** | Engine unified + case-insensitive; new test (579 tests)                                                                                                       |
| FIX-001      | Resolve phantom `validate-schema` (implement via schema-validator OR remove type) | **Done** | Phantom type removed from `RuleType`; to be reintroduced in INT-001                                                                                           |
| FIX-002      | Guard empty `condition.urlContains` in `buildDynamicRules`                        | **Done** | Already protected by early-return; no path to invalid regex                                                                                                   |
| ARCH-DEC-001 | Runtime UI decision (plain TS vs React)                                           | **Done** | Decided: plain TS. React removed on 2026-06-13                                                                                                                |
| QA-ARCH-001  | Remove orphan React subtree                                                       | **Done** | ~3,300 lines removed; full `tsc` now passes                                                                                                                   |
| QA-BUILD-001 | Full extension typecheck must pass                                                | **Done** | `tsc -p tsconfig.json` green after removal                                                                                                                    |
| QA-DOC-001   | Consolidate/archive obsolete status docs                                          | **Done** | Legacy analysis/planning/backlogs moved to `docs/_archive/`; INDEX rewritten                                                                                  |
| CAP-004      | Method-only rule (no urlContains) is ignored by DNR                               | **Done** | Resolved via QAI-001 / ADR-008: `toDynamicRule` emits a match-all regex for method-only rules; `describeRuleCoverage` is the single coverage source; UI warns |

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

| ID      | Title                               | Status   | Notes                                                                                                                           |
| ------- | ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| QP-006  | Evidence HTML export (professional) | **Done** | Self-contained report: KPI cards, status bars, assertion table, traffic waterfall, printable                                    |
| QP-007  | Complete replay/playback UI         | **Done** | Sequential replay + per-item status + playback speed control (0.5×/1×/2×/no-delay)                                              |
| QP-008  | Save session as replayable artifact | **Done** | Artifact freezes requests + baseline response/timing; replay flags drift vs baseline                                            |
| OBS-001 | Request/response diff (final UX)    | **Done** | Pin + compare two requests; side-by-side `diffText` with added/removed counts; contract diff (INT-002)                          |
| OBS-002 | Request waterfall (advanced)        | **Done** | Waterfall bars scaled to slowest visible request + status color                                                                 |
| OBS-003 | Request size analysis               | **Done** | UTF-8 byte size of request/response bodies in detail + row; `formatBytes`/`byteLength`                                          |
| OBS-004 | Execution trace visualizer          | **Done** | Timeline: capture → matched rules (with conflict hints) → conflict summary → response/pending; uses `detectConflicts` (INT-003) |
| OBS-006 | Baseline capture and comparison     | **Done** | Save session as baseline (storage); compare via `regression-detector` engine                                                    |
| OBS-007 | Regression report generator         | **Done** | `detectRegressions`: missing/new endpoints, status changes, contract drift; History UI                                          |

## P1 — Interception coverage (platform limitations)

| ID      | Title                                      | Status   | Notes                                                                                                                                                                                                 |
| ------- | ------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CAP-002 | Intercept `XMLHttpRequest` besides `fetch` | **Done** | XHR open/send patched in mock-bridge; conditional + static mocks + delay now work on XHR                                                                                                              |
| CAP-003 | Evaluate WebSocket capture                 | **Done** | Decision recorded in [ADR-007](docs/adr/ADR-007-websocket-capture-feasibility.md): MV3 cannot read WS frames at the network layer; future support must use in-page `WebSocket` patching (see CAP-005) |

## P2 — Performance & Analysis

| ID       | Title                     | Status |
| -------- | ------------------------- | ------ |
| OBS-008  | Traffic anomaly detection | Done   |
| PERF-001 | Bottleneck detection      | Done   |
| PERF-002 | Request timing breakdown  | Done   |
| PERF-003 | Bandwidth profiler        | Done   |

## Governance / Quality

| ID            | Title                                                      | Status   | Notes                                                                                                                                                                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-DOC-002    | Repair broken markdown links + link-check CI               | **Done** | `scripts/check-md-links.mjs` (zero deps) + CI job; fixed INDEX/README; archived dead frontend docs                                                                                                                                                                                                                                            |
| QA-CSS-001    | Class-by-class cleanup of orphan `styles/components/*.css` | **Done** | Removed 20 orphan component CSS (exact-token audit); kept `diff-viewer.css` + `modal.css`                                                                                                                                                                                                                                                     |
| QA-TEST-001   | Define a test strategy for the plain-TS UI                 | **Done** | Strategy documented (PROJECT_STATE §7b); pure helpers/view-models unit-tested in `utils.test.ts` (26 tests)                                                                                                                                                                                                                                   |
| QA-FMT-001    | Repo-wide Prettier formatting + green `format:check`       | **Done** | `npm run format` applied; `format:check` green                                                                                                                                                                                                                                                                                                |
| UI-ASSERT-001 | Assertion creation UI for typed assertions                 | **Done** | Type select + expected/path fields wired in `settings.ts`; unlocks INT-001 end-to-end                                                                                                                                                                                                                                                         |
| TD-010        | Deduplicate storage parsers                                | **Done** | Removed stale `rule-engine/storage-parsers.ts` (+tests); `storage/index.ts` is single source                                                                                                                                                                                                                                                  |
| TD-011        | Dedupe content-script types/guards (D-04/D-05/D-07)        | **Done** | Shared `rule-engine/content-guards.ts` used by injector + mock-bridge; +14 tests                                                                                                                                                                                                                                                              |
| TD-016        | Centralize rule-type label/action catalog (D-10)           | **Done** | `RULE_TYPE_CATALOG` in `shared/utils.ts`; `network.ts` consumes `summarizeRuleAction`                                                                                                                                                                                                                                                         |
| TD-014        | Decide `storage/adapter.ts` (adopt for Phase 4 or remove)  | **Done** | Removed orphan injectable adapter (YAGNI); ADR-002 amended. Reintroduce with consumers in Phase 4                                                                                                                                                                                                                                             |
| TD-006        | Remove phantom preview-only controls from functional views | **Done** | Removed dead `(Preview)` buttons + misleading pills from Rules/Mocks/History + header; real theme selector (light/dark/system) wired via `theme-manager`; Settings panel pill removed; Danger Zone "Reset Workspace" wired (`resetWorkspace` + two-step confirm); Runtime Diagnostics "Download Logs" wired (`buildDiagnosticsReport` export) |
| TD-017        | Plain-TS UI had no component stylesheet (UI looked broken) | **Done** | Authored `styles/components.css` (shell/nav/cards/forms/buttons/chips/lists/feature layouts) on tokens; fixed dark-mode bug (`--surface`→`--surface-bg`, `--accent`→`--info`); removed duplicate per-view headers; coverage 109→3 unstyled. Verified via browser                                                                              |

---

## P-MARKET — Gap analysis opportunities (QAI)

> Derived from a code-grounded market comparison (Requestly / Charles / Burp) on 2026-06-14.
> These are the **next prioritized opportunities** for the active queue. Out-of-scope items
> (SSL proxying, DNS spoofing, reverse proxy, port forwarding, Scanner/Intruder/Collaborator/
> Decoder/Sequencer, Map Remote) are intentionally excluded — see the strategic analysis.

| ID      | Name                                 | Description                                                                            | Benefit                                                         | Complexity | Priority | Dependencies                                              | Acceptance criteria                                                                         | Status      |
| ------- | ------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------- | -------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------- |
| QAI-001 | Method-only rule support (CAP-004)   | A rule with `method` but no `urlContains` is silently dropped by DNR; fix or warn.     | Removes a correctness footgun; rules behave as the UI implies   | Low        | **P0**   | [ADR-008](docs/adr/ADR-008-method-only-rule-semantics.md) | Method-only rule either matches via `<all_urls>` regex OR the UI blocks/warns before saving | **Done**    |
| QAI-002 | Response/request-body rewrite on XHR | `rewrite-response` + `rewrite-request-body` currently work only on `fetch`; cover XHR. | Parity with Requestly; the rule types stop half-working         | Medium     | **P1**   | —                                                         | XHR responses/bodies are rewritten like fetch; tests cover both transports                  | **Done**    |
| QAI-003 | Insert Scripts (browser injection)   | New rule type to inject JS into the page (main world), matched by URL.                 | High QA/dev value (feature flags, UI stubs); core Requestly gap | High       | **P1**   | [ADR-009](docs/adr/ADR-009-insert-scripts-injection.md)   | A script rule injects code on matching pages; toggle/enable; documented security boundary   | **Done**    |
| QAI-004 | Inject CSS                           | New rule type to inject CSS into matching pages.                                       | Visual QA; reuses QAI-003 injection infra at low extra cost     | Medium     | **P2**   | QAI-003                                                   | A CSS rule applies styles on matching pages; enable/disable; survives SPA navigation        | **Done**    |
| QAI-005 | Global traffic search                | Free-text search across captured requests (URL/headers/body).                          | Inspector usability (Burp Logger/Search parity)                 | Low        | **P1**   | —                                                         | Search box filters the Network list by substring across URL + captured fields               | **Done**    |
| QAI-006 | User-Agent override preset           | One-field UA override implemented as a `rewrite-header` preset.                        | Convenience for device/bot testing                              | Low        | **P2**   | —                                                         | Setting a UA produces a working `user-agent` header rewrite rule                            | Not started |
| QAI-007 | Global throttling profile            | A session-wide "slow network" profile beyond per-rule delay.                           | Repro of slow-network conditions without one rule per URL       | Medium     | **P2**   | —                                                         | Enabling a profile delays matching traffic globally; configurable ms; off by default        | Not started |
| QAI-008 | Testable save-builders (regression)  | Extract editor→Rule assembly into pure functions and unit-test them.                   | Prevents the TD-018 bug class (save dropping a field)           | Low        | **P2**   | —                                                         | `buildRuleFromEditor` / `buildMockFromEditor` pure + tested; handlers delegate to them      | **Done**    |
| QAI-009 | Breakpoints (pause + edit live)      | Pause a matching fetch/XHR and let the user edit before continuing.                    | Charles/Burp intercept parity (fetch/XHR only in MV3)           | High       | **P3**   | —                                                         | A matching request can be paused, edited, and resumed; documented fetch/XHR-only limitation | Not started |
| QAI-010 | Map Local (real file)                | Serve a picked local file as the full mocked response.                                 | Convenience over manual body paste                              | Medium     | **P3**   | —                                                         | A file picker fills a mock-response rule body + content-type                                | Not started |

---

## P-UX — Usability & performance fixes (QAI)

> Raised from real usage on 2026-06-14: large lists are slow, long URLs break the layout,
> components feel cramped, and the side panel needs a windowed mode.

| ID      | Name                         | Description                                                                      | Benefit                                                  | Complexity | Priority | Dependencies | Acceptance criteria                                                                     | Status                                                |
| ------- | ---------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- | -------- | ------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| QAI-011 | Paginate request lists       | Add pagination to lists that render many requests (Network, History, others).    | Lists stay responsive with hundreds/thousands of entries | Medium     | **P1**   | —            | Network + History lists page results; page controls; render cost bounded per page       | **Done** (Network + History; pure `paginate` + tests) |
| QAI-012 | Fix long-URL layout breakage | Long URLs overflow and break row/detail layout when a request is opened.         | Layout stays intact regardless of URL length             | Low        | **P0**   | —            | Long URLs truncate/wrap with ellipsis + title; no horizontal overflow in rows or detail | **Done**                                              |
| QAI-013 | Layout spacing review        | Components are visually glued together (insufficient gaps/padding) across views. | Cleaner, more readable, professional layout              | Low        | **P1**   | —            | Consistent spacing between cards/sections/rows; verified visually in light + dark       | **Done**                                              |
| QAI-014 | Open in a separate window    | Button to open the panel as a standalone window/tab, not only the side panel.    | More screen space; side-by-side with the app under test  | Low        | **P2**   | —            | A button opens the same UI in its own window/tab; works independently of the side panel | **Done**                                              |

---

## P-REPLAY — Replay fidelity & response inspection (QAI)

> Raised from real usage on 2026-06-14: Repeat / Edit-and-resend / Compose frequently return
> 403 because the original auth token (request headers/cookies) is not captured or reused; the
> Network detail shows only the HTTP status code, never the response message/body; and long URLs
> still break the Execution Timeline layout.

| ID      | Name                               | Description                                                                                                                               | Benefit                                                 | Complexity | Priority | Dependencies | Acceptance criteria                                                                                                            | Status   |
| ------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| QAI-015 | Capture & reuse request headers    | `onBeforeRequest` stores `headers: {}`; capture real request headers via `onSendHeaders` and replay with cookies so auth token is reused. | Repeat / Edit-and-resend / Compose stop returning 403   | Medium     | **P0**   | —            | Captured requests store real request headers; Repeat/Edit-resend/Compose reuse Authorization + cookies; replay no longer 403s  | **Done** |
| QAI-016 | Show response body/message         | Network detail shows only the status code; capture real response bodies at page level (fetch/XHR) and surface them in the detail view.    | QA sees the actual API response, not just the HTTP code | Medium     | **P1**   | —            | fetch/XHR response bodies captured via content script and shown in Network detail; honest empty-state when body is unavailable | **Done** |
| QAI-017 | Long URLs break Execution Timeline | Long URLs without spaces overflow and break the Execution Timeline layout inside the Network detail.                                      | Timeline stays intact regardless of URL length          | Low        | **P0**   | —            | Long URLs wrap/break inside `.exec-body`; no horizontal overflow in the Execution Timeline                                     | **Done** |

---

## Future Backlog (do not start without reprioritization)

- **Desktop proxy (Electron):** P4-001..P4-020 — see `docs/_archive/backlog/BACKLOG_EXPANDED.md` (historical catalog).
- **Team & Enterprise:** P5-001..P5-010.
- **AI & Advanced:** AI-002..AI-006, MOCK-002..004, SEC-001..004.
- **Interception coverage:** CAP-005 — WebSocket frame capture via in-page `WebSocket` patching (per [ADR-007](docs/adr/ADR-007-websocket-capture-feasibility.md)).

---

## Completed and verified items (evidence in code)

| ID           | Title                                                            | Evidence                                                               |
| ------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Phase 1 MVP  | Capture, DNR rules, fetch mocks, rewrite, block/delay/redirect   | `background/index.ts`, `mock-bridge.ts`                                |
| RW-001..005  | Rewrites url/header/query/request-body/response-body             | `background/index.ts`, `mock-bridge.ts`                                |
| MK-001..002  | Mock response + status                                           | `mock-bridge.ts`                                                       |
| NS-001..003  | Block / delay / redirect                                         | `background/index.ts`, `mock-bridge.ts`                                |
| NET-001..008 | Clear/HAR/cURL/repeat/compose/clone/edit-resend                  | `features/network.ts`, `background/index.ts`                           |
| MK-003       | Dynamic variables in templates                                   | `mock-bridge.ts` (`applyDynamicVariables`)                             |
| RQ-001..002  | Rule groups CRUD + enable/ordering                               | `features/rules.ts`, `background/index.ts`                             |
| QP-001       | Assertion evaluation pipeline                                    | `evaluateAssertions` in `features/network.ts`                          |
| QP-004/005   | Evidence export JSON/Markdown                                    | `shared/utils.ts`, `features/history.ts`                               |
| ARC-001..003 | Feature modules + typed messages + storage layer                 | `sidepanel/features/*`, `shared-types/messages.ts`, `storage/index.ts` |
| PERF-002     | Request timing breakdown (waiting/download)                      | `background/index.ts` (`onResponseStarted`), `features/network.ts`     |
| PERF-001     | Bottleneck detection (slow-request flags + reason)               | `rule-engine/src/bottleneck-detector.ts`, `features/network.ts`        |
| PERF-003     | Bandwidth profiler (per-endpoint bytes + throughput)             | `rule-engine/src/bandwidth-profiler.ts`, `features/network.ts`         |
| OBS-008      | Traffic anomaly detection (error spike, latency/payload outlier) | `rule-engine/src/anomaly-detector.ts`, `features/network.ts`           |
| TEST         | Rule-engine suite                                                | **628 tests / 28 files** green (vitest)                                |

> **Historical correction:** old test counts ("26", "198/469") are **false**.
> The current validated number is **628** (added anomaly-detector tests for OBS-008).
>
> **Note on engines:** all 6 rule-engine modules are now resolved. QP-002 (schema-validator) via INT-001;
> OBS-005 (conflict-detector) via INT-003; QP-003 (contract-comparator) via INT-002; AI-001 (schema-inference)
> via INT-006; MOCK-001 (conditional-mock) via INT-005; `rule-index.ts` removed (TECH-001).
