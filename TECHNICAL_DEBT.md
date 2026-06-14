# Technical Debt Register

## Severity Model

- Critical: blocks reliable delivery or creates high defect risk
- Major: causes persistent confusion, cost, or quality regression
- Medium: important but not immediate blocker
- Low: improvement opportunity

## Debt Items

> Updated 2026-06-13 after the 9-phase audit. Status column added.

| ID     | Severity | Status   | Debt                                                  | Evidence                                                                                                   | Risk                                  | Remediation                                              |
| ------ | -------- | -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| TD-001 | Critical | RESOLVED | Dual UI architecture without integration              | React subtree removed 2026-06-13 (~3,300 lines)                                                            | —                                     | Done: official stack = plain TS                          |
| TD-002 | Critical | RESOLVED | Extension full typecheck fails                        | `tsc -p tsconfig.json` now green after TSX removal                                                         | —                                     | Done                                                     |
| TD-003 | Major    | Open     | Backlog/documentation status conflicts                | 5 backlogs with divergent statuses                                                                         | Team planning drift                   | BACKLOG_CONSOLIDATED.md is now the only official backlog |
| TD-004 | Major    | Open     | Broken markdown links across docs                     | broken-link scan found many invalid relative links                                                         | Docs become non-operational           | Run doc-link repair pass and add CI check (QA-DOC-002)   |
| TD-005 | Major    | Open     | Stale metrics and dates in key status docs            | January 2025 and 198/469 counts (real = 578)                                                               | Decision-making on outdated data      | Archive stale docs (QA-DOC-001)                          |
| TD-006 | Medium   | Open     | Preview-only controls mixed with production controls  | sidepanel/index.html contains many preview-labeled actions                                                 | User confusion and support burden     | Separate preview lab area or hide behind feature flags   |
| TD-007 | Medium   | Open     | Scope inflation in docs versus code reality           | Some docs assert phase completion not reflected in runtime                                                 | Unrealistic roadmap confidence        | Adopt evidence-based completion criteria                 |
| TD-008 | Critical | Open     | Six engines implemented but not wired to runtime      | schema-validator/contract-comparator/conflict-detector/conditional-mock/schema-inference/rule-index unused | Recreated by mistake; wasted QA value | Connect them (INT-001..006)                              |
| TD-009 | Major    | Open     | `matchesCondition` triplicated with case divergence   | engine case-sensitive vs mock-bridge case-insensitive                                                      | Method matching bug between pipelines | Unify in rule-engine (INT-004)                           |
| TD-010 | Major    | Open     | Duplicated storage parsers                            | storage/index.ts vs rule-engine/storage-parsers.ts                                                         | Silent divergence                     | Single source; extension imports pure parsers            |
| TD-011 | Major    | Open     | Domain types copied in 4 places                       | Rule/RuleCondition/MockEnvVar redefined in injector/mock-bridge/parsers                                    | Type drift                            | Import from shared-types                                 |
| TD-012 | Medium   | Open     | `validate-schema` rule type is a no-op (phantom)      | type exists, no handler in background/mock-bridge                                                          | User creates rule that does nothing   | Implement via schema-validator or remove type (FIX-001)  |
| TD-013 | Medium   | Open     | Mocks/delay only intercept `fetch` (not XHR)          | mock-bridge patches window.fetch only                                                                      | Mocks silently fail on XHR sites      | Add XHR interception (CAP-002)                           |
| TD-014 | Medium   | Open     | `storage/adapter.ts` orphan (ADR-002 not implemented) | no imports of StorageAdapter in runtime                                                                    | Dead abstraction / unmet ADR          | Adopt for Phase 4 or remove (TD-003 backlog item)        |
| TD-015 | Low      | Open     | Orphan component CSS after TSX removal                | styles/components/\*.css styled the dead .tsx; modal.css is mixed                                          | Unused CSS weight                     | Class-by-class cleanup (QA-CSS-001)                      |

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
