# PROJECT_STATE — QA.Interceptor Platform

> **Single source of truth for the project.** Every AI session or developer MUST read
> this file and `BACKLOG_CONSOLIDATED.md` before starting any work.
> Update this document whenever you finish a feature or change the architecture.

**Last audit:** 2026-06-13 (full 9-phase audit, evidence by code + build + tests)
**Current health evidence:** `npm run build` ✅ · full `tsc` ✅ (no errors) · `npm test` ✅ 650 engine + 61 extension tests

---

## 1. Project goal

Open-source browser extension (Manifest V3) focused on QA and API testing. It lets QA
analysts intercept, modify, mock, and validate HTTP traffic without development knowledge.
Long-term goal: a lightweight, QA-oriented alternative to Requestly / Charles / Burp.
Everything runs **locally**; no data is collected or sent anywhere.

---

## 2. Current state

Functional MVP. The interception, rules, mocks, capture, assertions, and evidence-export
core works end to end. The 2026-06-13 audit removed the dead React layer (~3,300 lines) and
unblocked the full typecheck. Implemented-but-not-wired engines and platform limitations
remain, documented below.

---

## 3. Official architecture

**Closed decision (ADR-001/004 + audit):**

- **UI = plain TypeScript + imperative DOM.** `extension/src/sidepanel/index.html` +
  `features/*.ts`. **Do NOT use React.** The old `components/*.tsx` layer was removed.
- **Pure logic = bounded package `@qa-interceptor/rule-engine`.** No `chrome`/`window`/DOM.
- **Types = package `@qa-interceptor/shared-types`.** Single source of domain types and messages.
- **Storage = single layer `extension/src/storage/index.ts`** over `chrome.storage.local`.
- **Official rule engine = `evaluateRules`** (`rule-engine/src/index.ts`).

```
shared-types  ←  rule-engine  ←  extension (background / content / sidepanel / storage)
```

No circular dependencies. Import direction is unidirectional.

---

## 4. Features

### ✅ Working (validated by code + build)

- Request capture via `webRequest` + render in the inspector.
- Rules via DNR (all traffic): `rewrite-url`, `rewrite-header`, `redirect`, `block`, `rewrite-query`.
- Mocks via page bridge: `mock-response`, `mock-status`, `delay`, sequence mocks, and `rewrite-response`/`rewrite-request-body` all work on both `fetch` and `XMLHttpRequest` (CAP-002 + QAI-002).
- Insert Scripts: `insert-script` rule type injects custom JS into matching pages via `chrome.scripting` in the MAIN world on navigation completion (QAI-003 / ADR-009); default-disabled, restricted-URL skip.
- Inject CSS: `inject-css` rule type injects custom CSS into matching pages via `chrome.scripting.insertCSS` (QAI-004, same trail).
- Replay (`REPEAT_REQUEST`), compose, clone request. Real request headers (Authorization, etc.) are captured via `webRequest.onSendHeaders` and replayed with cookies (`credentials: "include"`), so Repeat / Edit-and-resend / Compose reuse the original auth token instead of 403ing (QAI-015).
- Response assertions (`evaluateAssertions` — wired in `network.ts`).
- Response diff (`diffText` — wired).
- Rule groups (priority + enabled-group filtering).
- Rule import/export (JSON), HAR import/export, copy as cURL.
- Evidence export JSON / Markdown / HTML (HTML = professional report: KPIs, status bars, assertion table, traffic waterfall — QP-006).
- Traffic baseline capture + regression report (`regression-detector` — OBS-006/007): missing/new endpoints, status changes, contract drift.
- Network waterfall scaled to slowest request + payload size analysis (OBS-002/003).
- Request timing breakdown: honest waiting (TTFB) vs download phases derived from `webRequest.onResponseStarted` (PERF-002).
- Bottleneck detection: flags slow requests (absolute + p90 relative) and classifies the cause (server-latency / transfer-size / mixed) — `bottleneck-detector` engine surfaced in the Network view (PERF-001).
- Bandwidth profiler: aggregates response bytes per endpoint with byte share and effective throughput (download-rate honest) — `bandwidth-profiler` engine surfaced in the Network view (PERF-003).
- Traffic anomaly detection: in-session error-rate spikes + latency/payload outliers via robust median+MAD statistics — `anomaly-detector` engine surfaced in the Network view (OBS-008).
- Session replay with playback speed + replayable artifact (frozen requests + baseline response/timing, drift detection — QP-007/008).
- Live edit propagation without reload (`storage.onChanged`).
- Dynamic variables in mock templates (`{{timestamp}}`, `{{uuid}}`, `{{method}}`, `{{url}}`, env vars).
- JSON Schema validation of responses (`schema-validator` via the `json-schema` assertion type — INT-001).
- Rule conflict detection in the execution trace (`conflict-detector` — INT-003).
- Structural contract drift in the diff compare flow (`contract-comparator` — INT-002).
- Typed assertion creation UI (status / header / json-path / body-contains / json-schema — UI-ASSERT-001).
- JSON Schema inference from a captured response body (`schema-inference` — INT-006).
- State-aware sequence mocks (`conditional-mock-evaluator` — INT-005): per-call responses via the Mocks view.

### 🟡 Partially implemented

- `OBS-001` Diff UI — functional, partial UX.
- `OBS-004` Execution trace — uses `conflict-detector` (INT-003): 4 conflict kinds with descriptions/suggestions.
- Response body capture — real `fetch`/`XHR` JSON/text bodies are now captured at the page level (mock-bridge passthrough) and attached to the matching captured request, shown in the Network detail with an honest empty-state when unavailable (QAI-016). Document/image/cross-origin/streamed responses still expose no body (MV3 `webRequest` limitation).

### 🟦 Implemented as engines, NOT wired to runtime (value ready, wiring missing)

> All rule-engine modules are now wired to the runtime (INT-001..006, TECH-001). None remain idle.

### ❌ Not implemented / phantom

- `validate-schema` rule type — **REMOVED** (FIX-001). JSON Schema validation was instead delivered
  as the `json-schema` assertion type (INT-001) — the natural home, since it checks responses rather than transforms traffic.
- `XMLHttpRequest` / WebSocket interception — mocks only catch `fetch`.
- Phase 4 (desktop proxy), Phase 5 (team/enterprise), Future Phase (AI/security) — not started.

---

## 5. Official directory structure

```
extension/
  manifest.json              MV3: DNR, webRequest, sidePanel, content script
  scripts/build.mjs          esbuild: background, sidepanel/main, injector, mock-bridge
  tsconfig.json              full typecheck (must pass)
  tsconfig.runtime.json      runtime scope
  src/
    background/index.ts      DNR sync + webRequest capture + replay
    content/injector.ts      injects bridge + relays messages
    content/mock-bridge.ts   patches fetch (mocks/rewrites/delay) on the page
    storage/index.ts         single storage layer (parsers + keys)
    sidepanel/
      main.ts                orchestrator
      index.html             markup for all views
      features/*.ts          rules, network, mocks, history, settings, navigation
      shared/                utils, modal-controller, theme-manager, types
      styles/                tokens, global, layout, components + styles/components/*.css
packages/
  shared-types/src/          index.ts (domain) + messages.ts (contracts)
  rule-engine/src/           pure logic + tests (*.test.ts)
docs/
  adr/                       ADR-001..006
  architecture/ planning/ reference/   active docs
  _archive/                  historical, read-only (analysis, planning, old backlogs)
```

---

## 6. Main flows

1. **DNR rules:** sidepanel saves a rule → `storage.onChanged` → background `syncDynamicRules` → `updateDynamicRules`. Applies to all traffic.
2. **Mock/rewrite (fetch):** injector reads storage → `RULES_UPDATE` to the page → mock-bridge patches `fetch` → on match returns a synthetic `Response` → `MOCK_APPLIED` → injector relays → background stores capture → sidepanel renders.
3. **Replay/compose:** sidepanel → `REPEAT_REQUEST` → background performs a real `fetch` → captures a new entry.
4. **Assertions/diff:** run in the sidepanel (`network.ts`) using `evaluateAssertions` and `diffText` from rule-engine.

---

## 7. Critical dependencies

- `esbuild` (bundling), `typescript`, `vitest` (tests for engine + extension utils), `@types/chrome`.
- Quality tooling: eslint, prettier, husky, commitlint, lint-staged.
- **No React runtime dependency** (removed). Do not reintroduce without an ADR.

---

## 7b. Testing strategy (QA-TEST-001)

The plain-TS UI keeps all business logic in **pure, side-effect-free functions** so it can be
unit-tested in a Node (vitest) environment without a DOM:

- **Rule-engine package** (`packages/rule-engine/*`): the analytical/decision core (matching,
  assertions, schema, contract, conflicts, regression, bottleneck, bandwidth, anomaly). Fully
  unit-tested (628 tests / 28 files).
- **UI helper layer** (`extension/src/sidepanel/shared/utils.ts`): pure formatters, view-model
  builders, and evidence/report generators. Unit-tested in `utils.test.ts` (26 tests). `document`
  is only referenced inside function bodies (e.g. `triggerDownload`), never at module load, so the
  module is Node-importable. Other pure shared helpers follow the same rule and are tested
  alongside (e.g. `theme-manager.ts`'s `resolveTheme`).
- **DOM wiring layer** (`features/*.ts`): thin imperative glue that reads/writes the DOM and
  delegates to the two layers above. It is validated by `tsc` (full typecheck) and `npm run build`
  (esbuild) rather than unit tests; jsdom is intentionally NOT a dependency.

Rule of thumb: when adding UI behavior, put the decision/format logic in a pure helper or in the
rule-engine and cover it with tests; keep `features/*.ts` limited to DOM plumbing.

---

## 7c. Styling architecture (TD-017)

CSS is layered and token-driven (`styles/index.css` imports in order):

1. `tokens.css` — design tokens (colors, spacing, typography, radius, shadows) + full light/dark
   themes via `html[data-theme="dark"]`.
2. `global.css` — reset, base element styles, focus, scrollbars, print.
3. `layout.css` — utility classes (flex/grid/spacing/text) + a few feature widgets
   (waterfall, anomaly, bandwidth, timing phases, danger button).
4. `components.css` — the **application component layer**: app shell, sidebar nav, cards/panels,
   forms/inputs, buttons, pills/chips, status tones, lists/cards, and per-feature layouts. This is
   what styles the semantic classes the plain-TS HTML and `features/*.ts` templates emit.
5. `components/diff-viewer.css`, `components/modal.css` — specific widgets.

Theme is applied at boot by `shared/theme-manager.ts` (localStorage, sync). When adding UI, reuse
existing tokens and component classes; do not inline colors or re-introduce React component CSS.

---

## 8. Known risks

- **R1 (Critical):** ~~mocks/delay only intercept `fetch`~~ — **FIXED** (CAP-002 + QAI-002): conditional + static
  mocks, delay, and now `rewrite-response`/`rewrite-request-body` all work on `XMLHttpRequest` as well as `fetch`.
  Residual: WebSocket frames are uncovered by design (see ADR-007 / CAP-003 — only in-page patching can
  read frames; tracked as future CAP-005).
- **R2 (Critical):** the 6 unwired engines may be "recreated" by mistake by future sessions.
- **R3 (Medium):** ~~divergent `matchesCondition`~~ — **FIXED** (INT-004): unified and case-insensitive.
- **R4 (Medium):** ~~phantom `validate-schema`~~ — **FIXED** (FIX-001): type removed until real implementation (INT-001).
- **R5 (Medium):** ~~`buildDynamicRules` missing guard~~ — **ALREADY PROTECTED** (FIX-002): early-return prevents invalid regex. Residual limitation: method-only rules are ignored by DNR (CAP-004).
- **R6 (Low):** ~~component CSS partially orphaned~~ — **FIXED** (QA-CSS-001): removed 20 orphan files; only `diff-viewer.css` + `modal.css` remain.

---

## 9. Recommended next task

**MVP is complete; Reporting & Observability is complete.** A code-grounded market gap analysis
(Requestly / Charles / Burp) on 2026-06-14 produced the **P-MARKET / QAI** opportunity queue in
`BACKLOG_CONSOLIDATED.md`. **QAI-001 (method-only rule / CAP-004) is Done** (ADR-008: `toDynamicRule`
mirrors the engine via `describeRuleCoverage`; UI warns; +12 engine tests). **QAI-005 (global
traffic search) is Done** (pure `buildSearchHaystack`/`matchesSearchQuery` over URL + all captured
fields; +8 extension tests). **QAI-002 (XHR rewrite parity) and QAI-008 (testable save-builders) are
Done** (rewrite-response/request-body now work on XHR; pure `buildRuleFromEditorValues`/
`buildMockFromEditorValues` + 16 tests). **QAI-003 (Insert Scripts) is Done** (ADR-009: `insert-script`
rule type injected via `chrome.scripting` MAIN world; `scripting` permission added). **QAI-004 (Inject
CSS), QAI-011 (pagination, Network + History), QAI-012/013/014 (UX fixes) are Done.** \*\*QAI-015
(capture & reuse request headers — fixes 403 on Repeat/Edit-resend/Compose via `onSendHeaders`

- `credentials: "include"`), QAI-016 (real fetch/XHR response bodies captured at page level and
  shown in the Network detail), and QAI-017 (long URLs no longer break the Execution Timeline) are
  Done.\*\* **Next task = QAI-006** (User-Agent preset) or QAI-007 (throttling). Out of scope (documented):
  SSL/DNS/reverse-proxy/port-forward (desktop only), Scanner/Intruder/Collaborator/Decoder/Sequencer
  (offensive security), Map Remote (= redirect).

---

## 10. Files that MAY be changed (active work zones)

- `extension/src/sidepanel/features/*.ts` — UI and wiring.
- `extension/src/background/index.ts` — DNR pipeline and capture.
- `extension/src/content/mock-bridge.ts` — fetch interception.
- `packages/rule-engine/src/*.ts` — pure logic (+ mandatory tests).
- `packages/shared-types/src/*.ts` — types and contracts.

## 11. Files that must NOT be changed without an architectural decision

- `extension/manifest.json` — change permissions only with a security justification.
- `extension/scripts/build.mjs` — stable build pipeline.
- `docs/adr/*.md` — accepted ADRs; create a new ADR instead of editing old ones.
