# RUNTIME_AUDIT — QA.Interceptor Platform

> **The honest status of each feature, judged by the Chrome runtime — not by the build.**
>
> This file exists because the project historically marked features "Done" on the strength
> of a green build and unit tests, while ~7,800 lines of DOM/Chrome wiring have no unit tests.
> A feature is only **truly Done** when it is verified working in the loaded extension.
>
> **Status legend:**
>
> - ✅ **Verified** — exercised in the loaded extension and confirmed working.
> - ❓ **Unverified** — code exists and builds, but nobody has confirmed it in the browser yet.
> - ⚠️ **Partial** — works in some cases, broken or incomplete in others (note the gap).
> - ❌ **Broken** — confirmed not working at runtime.
>
> Everything starts ❓ unless proven otherwise. Downgrade freely; only upgrade with evidence.

**Last updated:** 2026-10-02 · **How to verify:** `npm run build` → load `extension/dist` in
`chrome://extensions` → exercise the feature → record the result here.

---

## Core flow (the product's heartbeat)

| Feature                     | Code                                             | Status | Evidence / notes                                     |
| --------------------------- | ------------------------------------------------ | ------ | ---------------------------------------------------- |
| Side panel opens            | `sidepanel/main.ts`, `index.html`                | ✅     | Confirmed opening in Chrome (2026-10-02)             |
| Request capture + inspector | `background/index.ts` (webRequest), `network.ts` | ✅     | Confirmed capturing requests in Chrome (2026-10-02)  |
| Navigation between views    | `sidepanel/features/navigation.ts`               | ❓     | Tabs render; not yet click-tested across all 6 views |

---

## Rules (DNR — applies to all traffic)

> **Wiring analysis (2026-10-02, code-verified):** the full pipeline is connected with no
> loose fibers. UI handlers in `features/rules.ts` persist via `saveRules`/`saveRuleGroups`
> → `chrome.storage.local`. The background registers `chrome.storage.onChanged` and, when
> `rules`/`ruleGroups` change, calls `queueSyncDynamicRules` → `syncDynamicRules` →
> `chrome.declarativeNetRequest.updateDynamicRules`. Boot paths (`onInstalled`, `onStartup`)
> also sync. `toDynamicRule` maps all 5 DNR types correctly. **Awaiting runtime confirmation.**

| Feature                      | Code                                    | Status | Evidence / notes                               |
| ---------------------------- | --------------------------------------- | ------ | ---------------------------------------------- |
| Create / edit / delete rule  | `features/rules.ts`, `background`       | ❓     | Wiring OK (code); CRUD → storage → sync traced |
| Enable / disable rule        | `features/rules.ts`                     | ❓     | Wiring OK (code); toggle → `saveRules`         |
| `rewrite-url`                | `background` `toDynamicRule`            | ❓     | Wiring OK; needs real request in-browser       |
| `rewrite-header`             | `background` `readRewriteHeaderPayload` | ❓     | Wiring OK                                      |
| `redirect`                   | `background` `readRedirectPayload`      | ❓     | Wiring OK — easy visual test                   |
| `block`                      | `background`                            | ❓     | Wiring OK — easiest visual test (start here)   |
| `rewrite-query`              | `background` `readRewriteQueryPayload`  | ❓     | Wiring OK                                      |
| Method-only rule (QAI-001)   | `background` `toDynamicRule`            | ❓     | Match-all regex path; UI warning               |
| Rule groups (priority)       | `features/rules.ts`, `background`       | ❓     | Wiring OK                                      |
| Import / export rules (JSON) | `features/rules.ts`                     | ❓     | Pure JSON file round-trip                      |

---

## Mocks (page bridge — fetch + XHR)

| Feature                          | Code                                | Status | Evidence / notes                      |
| -------------------------------- | ----------------------------------- | ------ | ------------------------------------- |
| `mock-response` on fetch         | `content/mock-bridge.ts`            | ❓     |                                       |
| `mock-status` on fetch           | `content/mock-bridge.ts`            | ❓     |                                       |
| `delay`                          | `content/mock-bridge.ts`            | ❓     |                                       |
| `rewrite-response` (fetch + XHR) | `content/mock-bridge.ts`            | ❓     | QAI-002                               |
| `rewrite-request-body`           | `content/mock-bridge.ts`            | ❓     |                                       |
| XHR interception (CAP-002)       | `content/mock-bridge.ts`            | ❓     |                                       |
| Dynamic template vars (MK-003)   | `content/mock-bridge.ts`            | ❓     | `{{uuid}}`, `{{timestamp}}`, env vars |
| Sequence / conditional mocks     | `features/mocks.ts`, mock-bridge    | ❓     | INT-005                               |
| Insert Scripts (QAI-003)         | `background` `readInsertScriptCode` | ❓     | `chrome.scripting` MAIN world         |
| Inject CSS (QAI-004)             | `background` `readInjectCssCode`    | ❓     |                                       |

---

## Network view (inspection, replay, analysis)

| Feature                           | Code                                 | Status | Evidence / notes            |
| --------------------------------- | ------------------------------------ | ------ | --------------------------- |
| Repeat / replay request           | `background` `repeatRequest`         | ❓     | QAI-015 header reuse        |
| Edit-and-resend / compose / clone | `features/network.ts`                | ❓     |                             |
| Capture & reuse headers (QAI-015) | `background` `sanitizeReplayHeaders` | ❓     | 403 fix — needs real verify |
| Response body capture (QAI-016)   | `background` `attachResponseBody`    | ❓     |                             |
| Assertions (status/header/json)   | `features/network.ts`                | ❓     | UI-ASSERT-001 + INT-001     |
| JSON Schema validation (INT-001)  | `schema-validator` engine            | ❓     |                             |
| Request/response diff (OBS-001)   | `features/network.ts`                | ❓     |                             |
| Conflict detection (INT-003)      | `conflict-detector` engine           | ❓     |                             |
| Contract drift (INT-002)          | `contract-comparator` engine         | ❓     |                             |
| Schema inference (INT-006)        | `schema-inference` engine            | ❓     |                             |
| Waterfall / size analysis         | `features/network.ts`                | ❓     | OBS-002/003                 |
| Timing breakdown (PERF-002)       | `background`, `network.ts`           | ❓     |                             |
| Bottleneck / bandwidth / anomaly  | rule-engine + `network.ts`           | ❓     | PERF-001/003, OBS-008       |
| Global traffic search (QAI-005)   | `features/network.ts`                | ❓     |                             |
| Pagination (QAI-011)              | `features/network.ts`                | ❓     |                             |
| Copy as cURL / HAR import-export  | `features/network.ts`                | ❓     |                             |

---

## History / Reporting

| Feature                              | Code                           | Status | Evidence / notes |
| ------------------------------------ | ------------------------------ | ------ | ---------------- |
| Session replay + playback speed      | `features/history.ts`          | ❓     | QP-007           |
| Replayable artifact + drift (QP-008) | `features/history.ts`          | ❓     |                  |
| Evidence export JSON / MD / HTML     | `shared/utils.ts`, history     | ❓     | QP-004/005/006   |
| Baseline capture + regression report | `regression-detector`, history | ❓     | OBS-006/007      |

---

## Settings

| Feature                           | Code                                | Status | Evidence / notes |
| --------------------------------- | ----------------------------------- | ------ | ---------------- |
| Theme (light/dark/system)         | `shared/theme-manager.ts`, settings | ❓     | TD-006           |
| Assertion creation UI             | `features/settings.ts`              | ❓     | UI-ASSERT-001    |
| Reset workspace (danger zone)     | `features/settings.ts`              | ❓     | TD-006           |
| Download diagnostics / logs       | `shared/utils.ts`, settings         | ❓     | TD-006           |
| Open in separate window (QAI-014) | `features/settings.ts` / main       | ❓     |                  |

---

## How we fill this in

1. **Code analysis (Kiro):** trace each feature's wiring — DOM event → handler → storage/
   message → background → effect → UI update. Flag broken fibers (missing listeners,
   mismatched element IDs, messages with no receiver) as suspected ❌ before you even open
   Chrome.
2. **Runtime check (you):** exercise the feature in the loaded extension; report what you see.
3. **Record:** set the status + a one-line evidence note + date. Open a bug row in
   `BACKLOG_CONSOLIDATED.md` for every ❌ / ⚠️, with the exact repro.
