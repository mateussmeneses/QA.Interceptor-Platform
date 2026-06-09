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
