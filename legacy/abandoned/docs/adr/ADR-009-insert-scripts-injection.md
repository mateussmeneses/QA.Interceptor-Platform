# ADR-009: Insert Scripts — Page Script Injection via `chrome.scripting`

<!-- markdownlint-disable MD040 -->

**Status**: Accepted
**Date**: 2026-06-14
**Author**: Architect Agent
**Relates to**: QAI-003 (Insert Scripts), QAI-004 (Inject CSS, future reuse)

---

## Context

Insert Scripts is the single biggest competitive gap versus Requestly (QAI-003): QA and dev
users want to inject custom JavaScript into a matching page — to flip a feature flag, stub a
global, or probe UI state — without editing the app. The extension already interceps network
traffic but cannot run page-level code.

Two injection strategies exist in MV3:

| Strategy                         | Mechanism                                                                                     | CSP behavior                                                       | Verdict       |
| -------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------- |
| In-page `<script>` element       | Content script appends a `<script>` to the DOM (like `injector.ts` does for `mock-bridge.js`) | **Blocked** by the page's `script-src` CSP for inline/dynamic code | ❌ Unreliable |
| `chrome.scripting.executeScript` | Background asks the browser to run code in the page's MAIN world                              | **Not governed** by the page CSP (browser-injected)                | ✅ Reliable   |

The injector's existing trick works only because `mock-bridge.js` is a packaged
`web_accessible_resource` loaded by URL; arbitrary user code as inline text would be CSP-blocked
on most real sites. Therefore Insert Scripts must use `chrome.scripting`, not the DOM-append path.

---

## Decision

1. **New rule type `insert-script`** in `shared-types`, payload `{ code: string }`. It is a
   third execution trail — neither DNR (`toDynamicRule`) nor the page fetch/XHR bridge
   (`mock-bridge.ts`) handle it; both ignore it (no `case`).

2. **Injection runs from the background via `chrome.scripting.executeScript` in the MAIN world.**
   Trigger: `chrome.tabs.onUpdated` when `status === "complete"`. For each enabled `insert-script`
   rule whose condition matches the tab URL (reusing the engine's `matchesCondition` with a
   synthetic GET request), the background injects:

   ```js
   chrome.scripting.executeScript({
     target: { tabId },
     world: "MAIN",
     args: [code],
     func: (userCode) => {
       try {
         new Function(userCode)();
       } catch (e) {
         console.error("[QA.Interceptor] insert-script error", e);
       }
     }
   });
   ```

   `new Function(userCode)()` runs in the page's MAIN world but, because it executes inside a
   browser-injected script, it is not subject to the page's CSP.

3. **Requires the `scripting` permission** in the manifest (added). `tabs` and `<all_urls>` are
   already granted, so no new host scope.

4. **Engine ownership unchanged.** URL/method matching for `insert-script` reuses
   `matchesCondition` (ADR-004/008): the background builds a synthetic `InterceptedRequest`
   `{ method: "GET", url: tabUrl }`. No new matching semantics.

### Rejected alternatives

- **DOM-append `<script>` from a content script** — CSP-blocked on most production sites; gives
  silent failures (worst outcome for a QA tool). Rejected.
- **`registerContentScripts`** — heavier lifecycle, persists across reloads, harder to scope to
  dynamic per-rule conditions. `executeScript` on `tabs.onUpdated` is simpler and rule-driven.

---

## Security boundary (explicit)

Insert Scripts executes arbitrary JavaScript. This is acceptable **within a tightly framed
boundary**:

- The code is **authored by the user themselves**, stored **locally** (same storage as all
  rules), and run **only in the user's own tabs**. Nothing is fetched remotely or shared.
- This matches the product mission (a QA/dev tool the user drives), and mirrors Requestly's
  Insert Scripts feature.
- **Mitigations (non-negotiable):**
  - New `insert-script` rules default to **disabled** (consistent with `createDefaultRule`).
  - The rule editor shows a clear warning that the code runs on matching pages.
  - Injection errors are caught and logged, never thrown into the page.
  - Injection is skipped for restricted URLs (`chrome://`, `chrome-extension://`, the Web Store)
    where `executeScript` is not permitted.
- **Threat model:** the only risk is self-inflicted (the user injecting their own bad code into
  their own session). There is no third-party code path and no privilege escalation beyond what
  the user already has in their browser. We do NOT support importing scripts from a URL in this
  iteration (would widen the threat model — out of scope).

---

## Consequences

**Positive**

- Closes the top competitive gap vs Requestly with a reliable, CSP-proof mechanism.
- Reuses the engine matcher and the existing rule storage/UI; only one new rule type + one
  background trigger.
- Establishes the injection trail that QAI-004 (Inject CSS) will reuse via `insertCSS`.

**Negative / trade-offs**

- Adds the `scripting` permission, which slightly widens the extension's stated capabilities at
  install time. Justified by the feature's value and bounded by the security section above.
- A third execution trail to keep consistent with the engine (mitigated: it reuses
  `matchesCondition`, no parallel matcher).

**Guardrails**

- `insert-script` must NOT be added to `toDynamicRule` or the mock-bridge; it is injection-only.
- Default-disabled + restricted-URL skip are required, not optional.

---

## Implementation notes (for the developer-agent — not part of the decision)

- `packages/shared-types/src/index.ts`: add `"insert-script"` to `RuleType`.
- `extension/manifest.json`: add `"scripting"` to `permissions`.
- `extension/src/background/index.ts`: `chrome.tabs.onUpdated` listener → match enabled
  `insert-script` rules via `matchesCondition` → `chrome.scripting.executeScript` (MAIN world);
  skip restricted URLs.
- `extension/src/sidepanel/shared/{types.ts,utils.ts}`: add `insert-script` to `RuleType`,
  `isRuleType`, and `RULE_TYPE_CATALOG`.
- `extension/src/sidepanel/index.html`: add the option to the rule type/filter selects.
- Validate: `npm run build` · `tsc --noEmit` · `npm test` · lint · format.
