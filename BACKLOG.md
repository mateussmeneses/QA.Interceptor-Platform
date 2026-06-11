# Backlog

Use this file as the prioritized execution list. Keep status and acceptance criteria updated.

## Legend

- Priority: P0 (critical), P1 (high), P2 (medium)
- Status: Todo, In Progress, Done, Blocked

## MVP - Foundation

| ID | Item | Priority | Status | Owner | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| MVP-001 | Create extension shell | P0 | Done | Copilot | Manifest V3 extension workspace and build scripts created |
| MVP-002 | Configure Manifest V3 | P0 | Done | Copilot | Required permissions and entry points are defined in manifest |
| MVP-003 | Build Side Panel base UI | P0 | Done | Copilot | Side panel opens from action click and renders placeholder list |
| MVP-004 | Implement request capture | P0 | Done | Copilot | HTTP requests are captured and displayed with method, URL, and timestamp |
| MVP-005 | Implement response capture | P0 | Done | Copilot | Responses are linked to requests and show status and timing |
| MVP-006 | Implement Rule Engine core | P0 | Done | Copilot | Rules can be enabled and evaluated in deterministic order |

## MVP - Rewrite Rules

| ID | Item | Priority | Status | Owner | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| RW-001 | URL rewrite rule | P1 | Done | Copilot | Matching requests can rewrite target URL before dispatch |
| RW-002 | Header rewrite rule | P1 | Done | Copilot | Rule can add, update, and remove request headers |

## MVP - Mock Rules

| ID | Item | Priority | Status | Owner | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| MK-001 | Static mock response | P1 | Done | Copilot | Matching request can return local body without remote call |
| MK-002 | Mock status code | P1 | Done | Copilot | Rule can override status code for matching response path |

## MVP - Network Simulation

| ID | Item | Priority | Status | Owner | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| NS-001 | Block requests | P1 | Done | Copilot | Matching request can be blocked before remote call |
| NS-002 | Delay requests | P1 | Done | Copilot | Matching request can delay dispatch by configured duration |
| NS-003 | Redirect requests | P1 | Done | Copilot | Matching request can redirect to target URL |

## Priority Shift - Frontend First

Goal: prioritize a complete product-like frontend experience now, inspired by the interceptor UX structure, even when some actions remain non-functional in this phase.

## Execution Queue - Frontend Track

| ID | Item | Priority | Status | Owner | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| FE-001 | Define app shell and IA | P0 | Done | Copilot | None | Side panel adopts full product shell with left navigation, top actions, and content workspace |
| FE-002 | Build navigation and route skeleton | P0 | Done | Copilot | FE-001 | Navigation sections and route placeholders exist for Rules, Network, Mocks, History, Settings |
| FE-003 | Rules management screens (list + editor UI) | P0 | Done | Copilot | FE-002 | User can view, filter, and edit rule forms in UI; non-wired actions clearly labeled |
| FE-004 | Network inspector screen UI | P0 | Done | Copilot | FE-002 | Request/response table, detail drawer, status chips, and timeline-like presentation are visible |
| FE-005 | Mock playground screen UI | P0 | Done | Copilot | FE-002 | Mock response and status editor panels are complete with payload preview and QA hints |
| FE-006 | History and evidence screen UI | P1 | Done | Copilot | FE-002 | Captured sessions list and export placeholders are rendered with realistic empty/loading states |
| FE-007 | Settings and UX polish pass | P1 | Done | Copilot | FE-003, FE-004, FE-005 | Visual consistency, spacing system, and responsive behavior across narrow side panel widths |
| FE-008 | Non-functional controls labeling | P1 | Done | Copilot | FE-003, FE-004, FE-005 | Every non-implemented action is clearly marked as preview/skeleton to avoid UX ambiguity |

## Execution Queue - Technical Track (After Frontend)

| ID | Item | Priority | Status | Owner | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| NS-002-A | Delay requests runtime support | P1 | Done | Copilot | FE-004 | Matching requests can delay dispatch by configured duration |
| INT-001 | Connect Rules UI to runtime engine | P1 | Done | Copilot | FE-003, NS-002-A | Rule CRUD in UI updates runtime behavior without manual storage edits |
| INT-002 | Connect Network inspector UI to capture pipeline | P1 | Done | Copilot | FE-004 | Inspector screens consume real captured traffic and rule-match metadata |
| INT-003 | Connect Mock UI to mock bridge pipeline | P1 | Done | Copilot | FE-005 | Mock editors update fetch mock behavior and status override in real time |

## Delivered Foundations (Reference)

| ID | Item | Priority | Status | Owner | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| PLAN-001 | Validate MV3 mock transport strategy | P0 | Done | Copilot | None | Technical note created with proven approach for mock body + status handling in browser extension constraints |
| MK-001-A | Implement static JSON/text mock routing | P1 | Done | Copilot | PLAN-001 | Matching request returns local mock body without remote call and appears in captured traffic |
| MK-001-B | Add side panel controls for mock payload preview | P1 | Done | Copilot | MK-001-A | QA user can inspect active mock body source and confirm which rule mocked the request |
| MK-002-A | Implement status code override on mocked responses | P1 | Done | Copilot | MK-001-A | Mocked response can return configured status (e.g., 400/401/500) with deterministic behavior |
| MK-002-B | Add regression checks for rewrite + mock coexistence | P1 | Done | Copilot | MK-001-A, MK-002-A | RW-001/RW-002 keep working when mock rules are enabled |

## Delivery Notes

- Frontend Track is now the primary roadmap and should be executed top-down.
- Technical integration items should not block visual/frontend completion.
- Keep current runtime foundations stable while UI breadth is expanded.

## Execution Queue - Phase 1 Completion

| ID | Item | Priority | Status | Owner | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| EXP-001 | Export rules as JSON | P0 | Done | Copilot | INT-001 | User can download all current rules as a valid JSON file |
| IMP-001 | Import rules from JSON | P0 | Done | Copilot | INT-001 | User can upload a JSON file and rules are merged, skipping duplicate IDs |
| NET-001 | Clear captured session | P1 | Done | Copilot | INT-002 | Network inspector can be reset to empty without reloading the extension |
| NET-002 | Export HAR from Network inspector | P1 | Done | Copilot | INT-002 | User can download captured traffic as HAR 1.2 format JSON |
| TEST-001 | Unit tests for rule-engine | P0 | Done | Copilot | None | 26 tests covering evaluateRules: conditions, priority, shape, edge cases |
| RW-003 | Query parameter rewrite | P1 | Done | Copilot | RW-001 | Rule can add, replace, and remove query params via DNR queryTransform |
| RW-004 | Response body rewrite | P1 | Done | Copilot | MK-001-A | Rule can replace response body via fetch bridge while preserving real status |
| CAP-001 | Response body capture in Network inspector | P1 | Done | Copilot | INT-002 | Mocked and rewritten response bodies shown in Network detail panel |
| RW-005 | Request body rewrite | P1 | Done | Copilot | RW-001 | Rule can replace outgoing fetch request body before dispatch |
| HIST-001 | History export JSON | P1 | Done | Copilot | FE-006 | Selected session exported as structured JSON evidence package |
| HIST-002 | History export Markdown | P1 | Done | Copilot | FE-006 | Selected session exported as readable QA evidence markdown report |
| NET-003 | Copy request as cURL | P1 | Done | Copilot | INT-002 | Selected network request copied to clipboard as cURL command |
| NET-004 | Import HAR into Network inspector | P1 | Done | Copilot | NET-002 | User can upload HAR and merge entries into captured traffic list |

## Execution Queue - Phase 2 Request Tools

| ID | Item | Priority | Status | Owner | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| NET-005 | Repeat request from Network inspector | P1 | Done | Copilot | INT-002 | User can replay selected request and see new captured entry with response status/body |
| NET-006 | Compose request from Network inspector | P1 | Done | Copilot | NET-005 | User can build and send custom request (method/url/headers/body) and capture result in inspector |
| NET-007 | Clone selected request | P1 | Done | Copilot | NET-006 | User can clone selected request into compose form with one action |
| NET-008 | Edit and resend request | P1 | Done | Copilot | NET-006 | User can edit selected request fields and resend preserving workflow context |

## Execution Queue - Phase 2 Advanced Mocking

| ID | Item | Priority | Status | Owner | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| MK-003 | Dynamic variables in mock templates | P1 | Done | Copilot | MK-001 | Mock/rewrite response bodies support tokens like {{timestamp}}, {{uuid}}, {{method}}, {{url}} |
| MK-004 | Template responses library | P1 | Done | Copilot | MK-003 | User can select and apply reusable response templates from UI |
| MK-005 | Environment variables for mock payloads | P1 | Done | Copilot | MK-003 | User can define scoped env vars and reference them in mock payload templates |

## Execution Queue - Engineering Standards

| ID | Item | Priority | Status | Owner | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| ENG-001 | Define Semantic Versioning policy | P1 | Done | Copilot | None | Project documents SemVer pattern (MAJOR.MINOR.PATCH) and bump rules for breaking/feature/fix changes |
| ENG-002 | Enforce Conventional Commits with Husky | P1 | Done | Copilot | ENG-001 | commit-msg hook validates commit format using commitlint conventional config |
| ENG-003 | Enforce code quality on pre-commit | P1 | Done | Copilot | ENG-002 | pre-commit runs lint-staged to apply ESLint/Prettier checks on staged files |
| ENG-004 | Enforce zero-warning and latest-deps discipline | P1 | Done | Copilot | ENG-003 | Project rules require no warnings/deprecations and dependency freshness policy with backlog tracking for deferred updates |

## Requestly Benchmark Coverage Snapshot

Reference analysis: docs/requestly-benchmark-analysis.md

| Capability | Requestly State | QA.Interceptor State | Notes |
| --- | --- | --- | --- |
| Core rewrite/mock/simulation rules | Mature | Partial parity | Foundation delivered with URL/header/query/request-body/response-body, mock status/body, delay/block/redirect |
| Request tools (repeat/compose/clone/edit-resend) | Mature | Baseline delivered | NET-005 to NET-008 completed |
| HAR/cURL import-export | Mature | Baseline delivered | HAR import/export and cURL export delivered |
| Rule groups and grouped execution control | Mature | Missing | Needed for scale and QA workflow organization |
| Mock template library and env variables | Mature | Partial | Dynamic variables delivered; templates and env vars pending |
| Execution observability (devtools-level) | Mature | Partial | Sidepanel has matched rules; dedicated execution log panel pending |
| API client and QA assertions | Mature | Missing | Important for QA-centric contract and scenario validation |

## Execution Queue - Requestly Alignment (QA-First)

| ID | Item | Priority | Status | Owner | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| RQ-001 | Rule groups CRUD in Rules view | P1 | Done | Copilot | INT-001 | User can create, rename, delete, and assign rules to groups |
| RQ-002 | Group enable/disable and ordering | P1 | Done | Copilot | RQ-001 | Group toggle and priority order deterministically affect member rule execution |
| RQ-003 | Execution log timeline panel | P1 | Done | Copilot | INT-002, RQ-002 | User can inspect which rule matched each request with timestamp and action summary |
| RQ-004 | Template responses library | P1 | Done | Copilot | MK-003 | User can pick preset response templates and apply them in Mock editor |
| RQ-005 | Mock environment variables | P1 | Done | Copilot | MK-003 | User can define env variables and reference them in mock/rewrite templates |
| RQ-006 | Collections and folders for assets | P1 | Done | Copilot | RQ-001 | Rules, mocks, and composed requests can be organized in folders/collections |
| RQ-007 | Tags and quick filters | P2 | Done | Copilot | RQ-006 | User can label assets and filter quickly by tag in Rules/Network/Mocks |
| RQ-008 | Minimal API client (QA scope) | P1 | Done | Copilot | NET-006 | User can send saved requests, inspect response body/headers, and export evidence |
| RQ-009 | Response assertions presets | P1 | Done | Copilot | RQ-008 | QA user can define assertions for status, headers, and JSON path values |
| RQ-010 | Error simulation profiles | P1 | Todo | Copilot | NS-001, MK-002 | One-click profiles for 400/401/403/404/500 and network failure behavior |

## Execution Queue - Architecture Hardening

| ID | Item | Priority | Status | Owner | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| ARC-001 | Feature-based sidepanel modules | P1 | Todo | Copilot | FE-008 | Sidepanel code is split into feature folders (rules/network/mocks/history/settings) with bounded responsibilities |
| ARC-002 | Typed runtime message contracts | P1 | Todo | Copilot | ARC-001 | Background/content/sidepanel message payloads share typed contracts and runtime validation |
| ARC-003 | Storage abstraction layer | P2 | Todo | Copilot | ARC-002 | Storage access is centralized in one module to simplify future migration and testing |
