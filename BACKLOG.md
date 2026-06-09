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
| MK-001 | Static mock response | P1 | Todo | Unassigned | Matching request can return local body without remote call |
| MK-002 | Mock status code | P1 | Todo | Unassigned | Rule can override status code for matching response path |
