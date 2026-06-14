# PROJECT_STATE — QA.Interceptor Platform

> **Single source of truth for the project.** Every AI session or developer MUST read
> this file and `BACKLOG_CONSOLIDATED.md` before starting any work.
> Update this document whenever you finish a feature or change the architecture.

**Last audit:** 2026-06-13 (full 9-phase audit, evidence by code + build + tests)
**Current health evidence:** `npm run build` ✅ · full `tsc` ✅ (no errors) · `npm test` ✅ 579 tests / 20 files

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
- Mocks via fetch bridge (only `window.fetch`): `mock-response`, `mock-status`, `rewrite-response`, `rewrite-request-body`, `delay`.
- Replay (`REPEAT_REQUEST`), compose, clone request.
- Response assertions (`evaluateAssertions` — wired in `network.ts`).
- Response diff (`diffText` — wired).
- Rule groups (priority + enabled-group filtering).
- Rule import/export (JSON), HAR import/export, copy as cURL.
- Evidence export JSON / Markdown / HTML.
- Live edit propagation without reload (`storage.onChanged`).
- Dynamic variables in mock templates (`{{timestamp}}`, `{{uuid}}`, `{{method}}`, `{{url}}`, env vars).

### 🟡 Partially implemented

- `QP-006` HTML export — exists, no full charts/waterfall.
- `QP-007` Replay player — sequential replay, no timeline/scrubber.
- `OBS-001` Diff UI — functional, partial UX.
- `OBS-004` Execution trace — inline conflict badges (does not use the `conflict-detector` engine).
- Response body capture — only for mocked responses (MV3 `webRequest` limitation).

### 🟦 Implemented as engines, NOT wired to runtime (value ready, wiring missing)

> These modules compile and have green tests, but **no line executes** in the running
> extension. Do NOT recreate them. Wire them up (see backlog INT-*).

- `schema-validator.ts` (JSON Schema draft-07) — QP-002.
- `contract-comparator.ts` (contract drift) — QP-003.
- `conflict-detector.ts` (4 conflict kinds) — OBS-005.
- `conditional-mock-evaluator.ts` (conditional mock) — MOCK-001.
- `schema-inference.ts` (schema inference) — AI-001.
- `rule-index.ts` (concurrent indexed engine) — TECH-001 (decide: migrate or remove).

### ❌ Not implemented / phantom

- `validate-schema` rule type — **REMOVED** (FIX-001). Will be reintroduced as a real feature by INT-001.
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
    storage/adapter.ts       ⚠️ ORPHAN (see TECHNICAL_DEBT TD-014)
    sidepanel/
      main.ts                orchestrator
      index.html             markup for all views
      features/*.ts          rules, network, mocks, history, settings, navigation
      shared/                utils, modal-controller, theme-manager, types
      styles/                tokens, global, layout + styles/components/*.css
packages/
  shared-types/src/          index.ts (domain) + messages.ts (contracts)
  rule-engine/src/           pure logic + tests (*.test.ts)
docs/
  adr/                       ADR-001..006
  architecture/ backlog/ planning/ analysis/ reference/
```

---

## 6. Main flows

1. **DNR rules:** sidepanel saves a rule → `storage.onChanged` → background `syncDynamicRules` → `updateDynamicRules`. Applies to all traffic.
2. **Mock/rewrite (fetch):** injector reads storage → `RULES_UPDATE` to the page → mock-bridge patches `fetch` → on match returns a synthetic `Response` → `MOCK_APPLIED` → injector relays → background stores capture → sidepanel renders.
3. **Replay/compose:** sidepanel → `REPEAT_REQUEST` → background performs a real `fetch` → captures a new entry.
4. **Assertions/diff:** run in the sidepanel (`network.ts`) using `evaluateAssertions` and `diffText` from rule-engine.

---

## 7. Critical dependencies

- `esbuild` (bundling), `typescript`, `vitest` (engine tests), `@types/chrome`.
- Quality tooling: eslint, prettier, husky, commitlint, lint-staged.
- **No React runtime dependency** (removed). Do not reintroduce without an ADR.

---

## 8. Known risks

- **R1 (Critical):** mocks/delay only intercept `fetch` → do not work on sites using XHR.
- **R2 (Critical):** the 6 unwired engines may be "recreated" by mistake by future sessions.
- **R3 (Medium):** ~~divergent `matchesCondition`~~ — **FIXED** (INT-004): unified and case-insensitive.
- **R4 (Medium):** ~~phantom `validate-schema`~~ — **FIXED** (FIX-001): type removed until real implementation (INT-001).
- **R5 (Medium):** ~~`buildDynamicRules` missing guard~~ — **ALREADY PROTECTED** (FIX-002): early-return prevents invalid regex. Residual limitation: method-only rules are ignored by DNR (CAP-004).
- **R6 (Low):** component CSS (`styles/components/*.css`) is partially orphaned after the `.tsx` removal (needs class-by-class cleanup; `modal.css` is mixed — do not remove in bulk).

---

## 9. Recommended next task

**INT-001 — wire `schema-validator` to the runtime** (reintroduces `validate-schema` as a real
feature, with access to the response body and result display). Then **INT-003** (wire
`conflict-detector`, replacing the inline counting in `network.ts`). See `BACKLOG_CONSOLIDATED.md`.

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
- `extension/src/storage/adapter.ts` — orphan; **do not use or delete** without deciding TD-014.
