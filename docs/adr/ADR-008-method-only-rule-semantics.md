# ADR-008: Method-Only Rule Semantics — Adapters Must Mirror the Engine

<!-- markdownlint-disable MD040 -->

**Status**: Accepted
**Date**: 2026-06-14
**Author**: Architect Agent
**Relates to**: QAI-001 (CAP-004), TD-009 / INT-004 (single `matchesCondition` semantics)

---

## Context

A rule's condition has two optional fields: `method` and `urlContains`. A rule with a
`method` but **no** `urlContains` ("method-only", e.g. _block every `POST`_) is created
through the UI like any other rule.

The system executes rules through **two adapters** over the same domain:

| Trail                                                                                              | Match decision                                            | Method-only rule                                            |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Engine / `mock-bridge` (delay, mock-response, mock-status, rewrite-response, rewrite-request-body) | `matchesCondition` in `packages/rule-engine/src/index.ts` | ✅ Works — empty `urlContains` means "any URL"              |
| `declarativeNetRequest` (block, redirect, rewrite-url/header/query)                                | `toDynamicRule` in `extension/src/background/index.ts`    | ❌ Dropped — `if (!rule.condition.urlContains) return null` |

The domain layer already treats a method-only condition as **valid and matchable**
(`matchesCondition` only checks `urlContains` when it is present). The DNR adapter,
however, silently discards such rules. The UI lets the user create the rule, the rule
appears enabled, and nothing happens — a correctness footgun and a confidence-breaking
defect for a QA tool.

This is the **same class of divergence** that TD-009 / INT-004 eliminated when the two
trails disagreed on case-sensitivity of method matching: two execution paths drifting
from a single intended semantics.

---

## Decision

**Adapters must faithfully represent any rule the domain considers matchable.**

Concretely, for QAI-001:

1. **The rule-engine owns the semantics of coverage.** "A rule without `urlContains`
   matches any URL" is a domain fact and must live in exactly one place
   (`packages/rule-engine`). A small pure helper (e.g. `describeRuleCoverage(rule)` →
   `{ matchesAllUrls, methodScoped }`) centralizes this so neither the background nor the
   UI re-derives it from string/regex literals.

2. **The DNR adapter (`toDynamicRule`) must mirror the engine.** It must NOT early-return
   `null` solely because `urlContains` is absent. When only a method is present it emits a
   match-all `regexFilter` and keeps `requestMethods` as the real filter.
   **Invariant:** if the engine deems a rule matchable, the adapter never drops it for a
   missing URL.

3. **The UI is a UX layer, not a semantics layer.** When a rule's effective condition
   covers all traffic, the UI MAY show a non-blocking warning and SHOULD default the rule
   to **disabled**. The UI MUST NOT declare invalid what the engine declares valid.

### Rejected alternative — "block/validate in the UI"

Blocking method-only rules in the UI was rejected: it would contradict the engine (which
treats them as valid) and **recreate** the engine-vs-adapter divergence the project just
removed (TD-009). UI validation is therefore a complementary UX affordance only, never the
fix.

### Decision priority applied

Maintainability > Extensibility > Simplicity > Performance:

- **Maintainability** — one match semantics; the "ghost rule" disappears; the adapter
  becomes a faithful translation of the domain.
- **Extensibility** — the coverage concept lives in the shared engine, so the future
  desktop proxy (ADR-006 / P4) reuses the exact same method-only behavior without
  reimplementing it.

---

## Consequences

**Positive**

- Method-only rules behave as the UI implies, across both execution trails.
- The correctness footgun (CAP-004) is removed at its architectural root, not patched at
  the surface.
- A single source of truth for "what does this rule cover?" prevents the next drift.
- No new permission is required: the manifest already grants `host_permissions:
["<all_urls>"]`, so a match-all DNR filter is within existing scope.

**Negative / trade-offs**

- A match-all `regexFilter` can match a large volume of traffic. Mitigated by keeping
  `requestMethods` as the effective filter, relying on DNR's optimized matching, and
  defaulting such rules to **disabled** with a clear UI warning.
- One more pure helper in the engine. This is intentional surface area in the correct
  layer (ADR-004/005), not incidental complexity.

**Guardrails**

- A parity test in the rule-engine should assert that, for the same method-only rule, the
  coverage decision is consistent — protecting against a future regression that "fixes"
  this in the UI or the background and reintroduces divergence.
- Do NOT add semantic validation to the UI that contradicts `matchesCondition`.

---

## Implementation notes (for the developer-agent — not part of the decision)

- `packages/rule-engine`: add the pure coverage helper + tests.
- `extension/src/background/index.ts` (`toDynamicRule`): drop the URL-only early-return;
  emit a match-all `regexFilter` for the method-only case; keep `requestMethods`.
- `extension/src/sidepanel/features/rules.ts` + `index.html`: non-blocking "covers all
  traffic" hint; new method-only rules default to disabled.
- Validate: `npm run build` · `tsc --noEmit` · `npm test` (628 + 31, plus new) · lint ·
  format.
