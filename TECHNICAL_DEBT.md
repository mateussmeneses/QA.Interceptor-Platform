# Technical Debt Register

## Severity Model

- Critical: blocks reliable delivery or creates high defect risk
- Major: causes persistent confusion, cost, or quality regression
- Medium: important but not immediate blocker
- Low: improvement opportunity

## Debt Items

> Updated 2026-06-13 after the 9-phase audit. Status column added.

| ID     | Severity | Status   | Debt                                                  | Evidence                                                                                                                                                                                                           | Risk                                  | Remediation                      |
| ------ | -------- | -------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | -------------------------------- |
| TD-001 | Critical | RESOLVED | Dual UI architecture without integration              | React subtree removed 2026-06-13 (~3,300 lines)                                                                                                                                                                    | —                                     | Done: official stack = plain TS  |
| TD-002 | Critical | RESOLVED | Extension full typecheck fails                        | `tsc -p tsconfig.json` now green after TSX removal                                                                                                                                                                 | —                                     | Done                             |
| TD-003 | Major    | RESOLVED | Backlog/documentation status conflicts                | `BACKLOG_CONSOLIDATED.md` is the single official backlog; rival backlogs archived under `docs/_archive/`                                                                                                           | —                                     | Done 2026-06-14                  |
| TD-004 | Major    | RESOLVED | Broken markdown links across docs                     | `npm run check:links` (script + CI) green; fixed INDEX/README; archived dead frontend docs                                                                                                                         | —                                     | Done 2026-06-14                  |
| TD-005 | Major    | RESOLVED | Stale metrics and dates in key status docs            | Real count synced to **628 engine + 26 ext**; stale docs archived (QA-DOC-001); evidence-based health line                                                                                                         | —                                     | Done 2026-06-14                  |
| TD-006 | Medium   | RESOLVED | Preview-only controls mixed with production controls  | Phantom controls removed from Rules/Mocks/History; real theme selector (light/dark/system) wired via `theme-manager`; misleading Settings "Preview" pill removed; residual Settings cards self-labeled `(Preview)` | —                                     | Done 2026-06-14                  |
| TD-007 | Medium   | RESOLVED | Scope inflation in docs versus code reality           | Evidence-based completion adopted: `PROJECT_STATE.md` health line + per-item code evidence in backlog; `check:links` CI                                                                                            | —                                     | Done 2026-06-14                  |
| TD-008 | Critical | RESOLVED | Six engines implemented but not wired to runtime      | All wired (INT-001..006); `rule-index.ts` removed (TECH-001). No idle engines remain                                                                                                                               | —                                     | Done 2026-06-14                  |
| TD-009 | Major    | RESOLVED | `matchesCondition` triplicated with case divergence   | Unified, case-insensitive, canonical in `rule-engine/index.ts`; background + mock-bridge import it (INT-004/TECH-001)                                                                                              | —                                     | Done 2026-06-14                  |
| TD-010 | Major    | RESOLVED | Duplicated storage parsers                            | Removed stale `rule-engine/storage-parsers.ts` (+tests); `storage/index.ts` is the single source                                                                                                                   | —                                     | Done 2026-06-14                  |
| TD-011 | Major    | RESOLVED | Domain types copied in 4 places                       | Content scripts now import shared `content-guards.ts` (types + guards) from rule-engine                                                                                                                            | —                                     | Done 2026-06-14 (D-04/D-05/D-07) |
| TD-012 | Medium   | RESOLVED | `validate-schema` rule type is a no-op (phantom)      | Type removed (FIX-001); schema validation delivered as the `json-schema` assertion (INT-001)                                                                                                                       | —                                     | Done 2026-06-13                  |
| TD-013 | Medium   | RESOLVED | Mocks/delay only intercept `fetch` (not XHR)          | CAP-002: XHR `open`/`send` patched; conditional + static mocks + delay work on XHR                                                                                                                                 | — (rewrite-response still fetch-only) | Done 2026-06-14                  |
| TD-014 | Medium   | RESOLVED | `storage/adapter.ts` orphan (ADR-002 not implemented) | Removed orphan injectable adapter (YAGNI); ADR-002 amended; `storage/index.ts` is the layer in use                                                                                                                 | —                                     | Done 2026-06-14                  |
| TD-015 | Low      | RESOLVED | Orphan component CSS after TSX removal                | Removed 20 orphan component CSS files (exact-token usage audit); kept diff-viewer.css + modal.css                                                                                                                  | —                                     | Done 2026-06-14                  |
| TD-016 | Low      | RESOLVED | Rule-type label/action maps duplicated (D-10)         | Single `RULE_TYPE_CATALOG` in `shared/utils.ts`; `network.ts` consumes shared `summarizeRuleAction`                                                                                                                | —                                     | Done 2026-06-14                  |

## Debt by Category

### Build and Quality Debt

- Incomplete static validation boundary (runtime-only passes, full package fails)
- Missing CI guardrail for docs links and stale status docs

### Architecture Debt

- Parallel UI implementation styles without migration strategy
- Runtime and component-library boundaries undefined

### Product and Backlog Debt

- Historical done states not reconciled with partial/skeleton implementations
- Acceptance criteria not consistently tied to executable tests

### Documentation Debt

- Broken links and stale references
- Multiple status dashboards with contradictory data

## Proposed Debt Burn-down Order

1. TD-001 and TD-002 (critical architecture/build integrity)
2. TD-003 and TD-004 (governance and docs operability)
3. TD-005 to TD-007 (quality and UX confidence)

## Debt Acceptance Policy (recommended)

A backlog item can only be moved to Done if:

1. Code exists in runtime path
2. Build/typecheck/test gates pass for relevant scope
3. Acceptance criteria validated with evidence links
4. Documentation references updated
