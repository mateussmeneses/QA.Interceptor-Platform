# QA.Interceptor Platform — Expanded Backlog (60+ Items)

**Legend**:
- **ARCHITECT**: Architecture decisions, design patterns, package structure, infrastructure, security, performance strategy
- **DEVELOPER**: Feature implementation, UI/UX, bug fixes, routine functionality, testing
- **PRIORITY**: P0 (critical), P1 (high), P2 (medium), P3 (low/nice-to-have)
- **PHASE**: 3.5, 4, 5, Future
- **EFFORT**: XS (< 2h), S (2-4h), M (4-8h), L (8-16h), XL (16+ h)

---

## PHASE 3.5: REPORTING & OBSERVABILITY (In Progress)

### Evidence Export & Test Documentation

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **QP-004** | Export test evidence as JSON | DEVELOPER | P0 | M | **Done** | EvidenceReport schema: label, period, summary, assertions, traffic entries |
| **QP-005** | Export test evidence as Markdown | DEVELOPER | P0 | M | **Done** | Assertions table + traffic timeline, generatedAt footer |
| **QP-006** | Export test evidence as HTML report | DEVELOPER | P1 | L | Ready | Standalone HTML with charts, timeline, traffic waterfall |
| **QP-007** | Session replay/playback UI | DEVELOPER | P0 | L | **Done** | Replay panel with Start/Cancel/Close, progress indicator, per-request status |
| **QP-008** | Save session as replayable artifact | DEVELOPER | P0 | M | Ready | Capture all requests/responses with timing, make offline-replayable |

### Request/Response Inspection & Diff

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **OBS-001** | Request/response diff UI | DEVELOPER | P1 | L | **Done** | Side-by-side line diff (LCS-based), Pin baseline + Compare buttons, color coding |
| **OBS-002** | Request waterfall visualization | DEVELOPER | P1 | L | Ready | Timeline chart showing all requests with start/duration/end times |
| **OBS-003** | Request size analysis | DEVELOPER | P1 | M | Ready | Show request/response size breakdown, identify bloated payloads |
| **OBS-004** | Execution trace visualizer | DEVELOPER | P1 | M | **Done** | Rule badges with type pills, conflict detection (⚠ duplicate types), response status badge |
| **OBS-005** | Rule conflict detector | ARCHITECT | P1 | M | **Done** | Pure engine in rule-engine: 4 conflict kinds (dimension, shadow, priority-tie, terminal-unreachable), 26 tests |

### Traffic Comparison & Regression Detection

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **OBS-006** | Baseline capture & comparison | DEVELOPER | P1 | L | Ready | Save traffic baseline, compare new session against it, highlight drift |
| **OBS-007** | Regression report generator | DEVELOPER | P1 | M | Ready | Identify breaking changes: new error codes, missing fields, type changes |
| **OBS-008** | Traffic anomaly detection | DEVELOPER | P2 | L | Ready | Flag unusual patterns: unexpected status codes, retry storms, timeout frequency |

### Performance Profiling

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **PERF-001** | Bottleneck detection | DEVELOPER | P2 | M | Ready | Identify slowest requests/endpoints, highlight N+1 patterns |
| **PERF-002** | Request timing breakdown | DEVELOPER | P2 | M | Ready | Show DNS + TLS + server + transfer + rendering times per request |
| **PERF-003** | Bandwidth profiler | DEVELOPER | P2 | S | Ready | Total data sent/received, identify large payloads, compression analysis |

---

## PHASE 4: DESKTOP/PROXY ENGINE (Not Started)

### HTTP Proxy Core

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **P4-001** | HTTP proxy server skeleton | ARCHITECT | P1 | M | **Designed** | Architecture in ADR-006: http-proxy.ts + connect-handler.ts + tls-ca.ts + rule-bridge.ts package layout |
| **P4-002** | Implement HTTP CONNECT tunneling | DEVELOPER | P1 | M | Not Started | Handle HTTP/1.1 CONNECT for HTTPS traffic routing |
| **P4-003** | Proxy configuration UI | DEVELOPER | P1 | M | Not Started | Port number, bypass rules, DNS override |
| **P4-004** | System proxy settings integration | ARCHITECT | P1 | L | Not Started | Auto-register OS proxy on startup, cleanup on exit (Windows/Mac/Linux) |
| **P4-005** | Proxy request/response pipeline | DEVELOPER | P1 | L | Not Started | Intercept at proxy layer, apply rules, send to server, capture response |

### HTTPS Interception

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **P4-006** | SSL/TLS certificate authority | ARCHITECT | P1 | L | Not Started | Generate self-signed root CA, issue certs per domain (node-forge) |
| **P4-007** | Install CA in OS trust store | DEVELOPER | P1 | M | Not Started | macOS: Keychain, Windows: CertStore, Linux: /etc/ca-certificates |
| **P4-008** | HTTPS proxy tunnel with cert interception | DEVELOPER | P1 | L | Not Started | Intercept CONNECT, generate cert, proxy HTTPS traffic |
| **P4-009** | Certificate pinning bypass | DEVELOPER | P2 | L | Not Started | Optionally disable cert validation for dev environments |

### Device Traffic Interception

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **P4-010** | Mobile device proxy routing | DEVELOPER | P1 | M | Not Started | Setup Android/iOS to route through desktop proxy (WiFi settings) |
| **P4-011** | Android traffic capture | DEVELOPER | P1 | M | Not Started | Intercept app traffic via proxy, handle HTTPS, WebSocket |
| **P4-012** | iOS traffic capture | DEVELOPER | P1 | L | Not Started | Route through proxy, handle non-standard clients |
| **P4-013** | Device discovery & pairing UI | DEVELOPER | P1 | M | Not Started | Detect devices on network, configure proxy settings, show connection status |

### Non-Browser Traffic

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **P4-014** | Electron app traffic interception | DEVELOPER | P1 | M | Not Started | Route Electron process traffic through proxy |
| **P4-015** | Node.js/CLI traffic capture | DEVELOPER | P1 | S | Not Started | Capture HTTP client traffic (axios, fetch, node http) |
| **P4-016** | Java application traffic capture | DEVELOPER | P2 | M | Not Started | Capture traffic from JVM apps (Spring Boot, etc.) |
| **P4-017** | .NET application traffic capture | DEVELOPER | P2 | M | Not Started | Capture traffic from .NET Framework, .NET Core apps |

### Desktop UI & Integration

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **P4-018** | Desktop app skeleton (Electron) | ARCHITECT | P1 | M | Not Started | Main window, system tray, background proxy management |
| **P4-019** | Migrate sidepanel to desktop UI | DEVELOPER | P1 | L | Not Started | Reuse React components, adapt for desktop (no browser constraints) |
| **P4-020** | Desktop proxy control panel | DEVELOPER | P1 | M | Not Started | Start/stop proxy, port config, traffic volume indicator |

---

## PHASE 5: TEAM & ENTERPRISE (Not Started)

### Cloud Sync & Workspace Sharing

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **P5-001** | Cloud storage abstraction layer | ARCHITECT | P3 | L | Not Started | Firebase, or self-hosted, optional toggle (default off) |
| **P5-002** | Shared collections sync | DEVELOPER | P3 | M | Not Started | Sync rules/groups to cloud, share with team, real-time updates |
| **P5-003** | Shared mock templates library | DEVELOPER | P3 | M | Not Started | Organization-wide template repository with versioning |
| **P5-004** | Workspace member management | DEVELOPER | P3 | M | Not Started | Invite members, assign roles, manage access |

### Access Control & Governance

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **P5-005** | Role-based access control (RBAC) | ARCHITECT | P3 | M | Not Started | Admin, Editor, Viewer roles with granular permissions |
| **P5-006** | Audit log system | DEVELOPER | P3 | M | Not Started | Track rule changes, access, exports, compliance reporting |
| **P5-007** | API token authentication | DEVELOPER | P3 | S | Not Started | Machine-to-machine auth for CI/CD integration |
| **P5-008** | SSO integration | DEVELOPER | P3 | L | Not Started | SAML/OAuth for enterprise directories |

### Enterprise Reporting

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **P5-009** | Aggregate team traffic dashboard | DEVELOPER | P3 | L | Not Started | Traffic volume by app/domain, error rate trends, compliance metrics |
| **P5-010** | Compliance report generator | DEVELOPER | P3 | M | Not Started | GDPR, SOC2, audit-ready reports from audit logs |

---

## PHASE FUTURE: AI & ADVANCED FEATURES (Research)

### API Contract Discovery

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **AI-001** | Auto-generate JSON Schema from traffic | ARCHITECT | P2 | L | **Done** | schema-inference.ts: inferSchema/mergeSchemas/inferSchemaFromSamples, format detection (date/uuid/uri/email), multi-sample merge with required=intersection; 30+ tests |
| **AI-002** | Suggest assertions from traffic | DEVELOPER | P2 | M | Not Started | ML model to recommend assertions: status, headers, json-paths |
| **AI-003** | API contract drift detection | DEVELOPER | P2 | M | Not Started | Compare captured traffic against expected schema, alert on breaks |

### AI-Powered Rule Generation

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **AI-004** | AI rule generator (Claude/GPT) | DEVELOPER | P2 | M | Not Started | Describe use case, generate rule (URL pattern, transformation logic) |
| **AI-005** | AI mock generator | DEVELOPER | P2 | M | Not Started | Describe mock scenario, generate realistic JSON response |
| **AI-006** | Traffic-based rule suggestions | DEVELOPER | P2 | L | Not Started | Analyze common traffic patterns, suggest reusable rules |

### Advanced Mocking

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **MOCK-001** | Conditional mock logic (if-then) | ARCHITECT | P2 | M | **Done** | conditional-mock-evaluator.ts: 7 condition kinds (always, url-match, method, header, body, sequence, call-count), immutable state, 25 tests |
| **MOCK-002** | State-aware mock responses | DEVELOPER | P2 | M | Not Started | Mock tracks state: first request → response A, second → response B |
| **MOCK-003** | Mock dependencies & chains | DEVELOPER | P2 | L | Not Started | Chain multiple mocks: mock A triggers condition for mock B |
| **MOCK-004** | GraphQL mock support | DEVELOPER | P2 | M | Not Started | Mock GraphQL queries/mutations with schema validation |

### Advanced Security Analysis

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **SEC-001** | Security header analyzer | DEVELOPER | P2 | S | Not Started | Check CORS, CSP, X-Frame-Options, HSTS, etc. |
| **SEC-002** | SQL injection detector | DEVELOPER | P2 | M | Not Started | Scan request/response payloads for injection patterns |
| **SEC-003** | Sensitive data detector | DEVELOPER | P2 | S | Not Started | Flag PII, API keys, credentials in traffic |
| **SEC-004** | OWASP compliance checker | DEVELOPER | P2 | M | Not Started | Report on OWASP Top 10 risks observed in traffic |

---

## TECHNICAL DEBT & MAINTENANCE (P2/P3)

### Code Quality

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **TECH-001** | Refactor rule-engine for performance | ARCHITECT | P2 | M | **Done** | RuleIndex: pre-sorted, method-partitioned, URL-bucketed, terminal early-exit; computeRuleFingerprint for cache invalidation; 22 tests |
| **TECH-002** | Add integration tests | DEVELOPER | P2 | L | Not Started | End-to-end tests: extension + backend, multi-browser |
| **TECH-003** | Add e2e browser tests | DEVELOPER | P2 | L | Not Started | Playwright/Cypress tests for UI workflows |
| **TECH-004** | Improve error handling coverage | DEVELOPER | P2 | M | Not Started | Handle edge cases: malformed responses, network errors |
| **TECH-005** | Add performance benchmarks | DEVELOPER | P2 | M | Not Started | Measure rule evaluation time, storage access time |

### Documentation

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **DOC-001** | Developer onboarding guide | DEVELOPER | P2 | S | Not Started | How to setup dev environment, run tests, build extension |
| **DOC-002** | Architecture decision records (ADRs) | ARCHITECT | P2 | S | **Done** | 6 ADRs in docs/adr/: feature modules, storage, messages, rule-engine package, pure functions, Phase 4 proxy |
| **DOC-003** | API documentation for rule engine | DEVELOPER | P2 | S | Not Started | Rule evaluation API, assertion API, schema validation API |
| **DOC-004** | User guide for QA workflows | DEVELOPER | P2 | M | Not Started | Step-by-step guides: create mock, set assertion, export evidence |

### Dependencies & Infrastructure

| ID | Title | Owner | Priority | Effort | Status | Notes |
|---|---|---|---|---|---|---|
| **INFRA-001** | Setup CI/CD pipeline | ARCHITECT | P2 | M | **Done** | .github/workflows/ci.yml: lint, typecheck, test, build, commitlint jobs |
| **INFRA-002** | Setup automated releases | DEVELOPER | P2 | S | Not Started | Tag releases, auto-publish to Chrome Web Store |
| **INFRA-003** | Monitor extension performance | DEVELOPER | P2 | M | Not Started | Telemetry (opt-in): crashes, slow operations, feature adoption |
| **INFRA-004** | Setup security scanning | ARCHITECT | P2 | S | **Done** | .github/dependabot.yml: weekly updates for all 4 workspaces + github-actions |

---

## BACKLOG SUMMARY

| Phase | Total Items | Architect | Developer | Status |
|-------|---|---|---|---|
| **3.5** | 17 | 3 | 14 | **In Progress** |
| **4** | 20 | 4 | 16 | Not Started |
| **5** | 10 | 2 | 8 | Not Started |
| **Future (AI)** | 10 | 1 | 9 | Not Started |
| **Technical Debt** | 14 | 4 | 10 | Not Started |
| **TOTAL** | **71** | **14** | **57** | |

---

## PRIORITY MATRIX FOR NEXT 8 WEEKS

### Week 1-2: Phase 3.5 Foundation
1. QP-004: Export evidence JSON
2. QP-005: Export evidence Markdown
3. QP-007: Session replay UI
4. OBS-001: Request/response diff UI

### Week 3-4: Phase 3.5 Advanced
1. OBS-002: Waterfall visualization
2. OBS-004: Execution trace visualizer
3. OBS-005: Rule conflict detector
4. QP-006: Export HTML report

### Week 5-6: Phase 3.5 Completion
1. OBS-006: Baseline capture & comparison
2. OBS-007: Regression report generator
3. PERF-001: Bottleneck detection
4. Bug fixes & polish

### Week 7-8: Phase 4 Planning & Alpha
1. ARCHITECT: Design proxy architecture (P4-001, P4-002, P4-006)
2. DEVELOPER: Implement HTTP proxy skeleton
3. DEVELOPER: HTTPS CA implementation
4. DEVELOPER: System proxy integration

---

## RECOMMENDED NEXT ACTIONS

### Immediate (This Sprint)
1. ✅ Assign Architect to design Phase 3.5 evidence export schema
2. ✅ Assign Developer to implement QP-004, QP-005
3. ✅ Start work on OBS-001 (diff UI)
4. ✅ Plan Phase 4 architecture review

### Before Phase 4 Starts
1. Review all Phase 3.5 metrics (test coverage, performance)
2. Create architecture design doc for proxy engine (ARCHITECT)
3. Evaluate proxy libraries (http-server, express, etc.)
4. Plan database structure for audit logs (if Phase 5 starts soon)

### Team Allocation (Recommended)
- **Architect**: 20% Phase 3.5 oversight, 40% Phase 4 planning, 40% technical debt/infra
- **Developer(s)**: 60% Phase 3.5 implementation, 30% Phase 4 alpha, 10% bug fixes

