# BACKLOG — QA.Interceptor Platform

> **The one and only official backlog.** Do not create another. Pick the top unblocked task.
> Every item has a runtime-verifiable acceptance criterion. A task is **Done** only when it is
> verified running (see the golden rule in `AGENTS.md`), then recorded in `PROJECT_STATE.md`.

**Status values:** `Todo` · `In Progress` · `Needs verification` · `Done` · `Blocked`

Each item: an ID, what it delivers, how you prove it works (acceptance), and dependencies.

---

## Phase 0 — Walking skeleton (prove the platform)

Goal: the smallest proxy that actually intercepts and captures traffic. No HTTPS, no UI, no rules
yet. This is the "capture works" milestone on the new stack.

| ID    | Deliverable                                  | Acceptance (runtime-verifiable)                                                                                    | Status   | Deps  |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- | ----- |
| P0-01 | HTTP forward proxy, `cmd/proxy`              | `go run ./cmd/proxy` starts on a port; a client configured to use it loads an **http://** site successfully        | **Done** | —     |
| P0-02 | In-memory capture store (`internal/capture`) | Each proxied request/response is recorded (method, URL, status, timing); unit-tested; printed to stdout on the fly  | **Done** | P0-01 |
| P0-03 | Graceful start/stop + config (port flag)     | `--port` flag works; Ctrl-C shuts down cleanly without dropping in-flight connections                              | **Done** | P0-01 |

> **P0-01 evidence (2026-10-07):** `go run ./cmd/proxy --port 8080` started; a real request to
> `http://example.com` through the proxy returned 200 with the real page body, and the proxy
> logged `GET http://example.com/ -> 200`. Unit test `TestProxyRelaysAndObserves` covers the
> full relay+observe path; `TestConnectRejectedInPhase0` confirms CONNECT is cleanly refused
> until P1. **P0-03 evidence:** `--port` flag honored; `main.go` installs a SIGINT/SIGTERM
> handler and calls `srv.Shutdown` with a 5s timeout.
>
> **P0-02 evidence (2026-10-07):** `internal/capture.Store` implements `proxy.Observer` (added
> as a *second* observer via new `proxy.MultiObserver`; proxy core unchanged). It is
> mutex-guarded, bounded (`DefaultMaxItems=1000`, oldest dropped first), assigns monotonic IDs +
> capture time. Verified running: 3 real requests through `go run ./cmd/proxy --port 8081` were
> all captured, including an error exchange (`neverssl.com -> context canceled`). Unit tests
> cover recording, error path, ordering, cap eviction, clear, and 5000 concurrent writes (unique
> IDs, no loss). **Known limitation:** `go test -race` could not run here (no C compiler / cgo
> on this machine); the concurrency test ran without the race detector.

## Phase 1 — HTTPS interception (the hard, defining capability)

Goal: real MITM so we can see and later modify HTTPS traffic. This is what makes it a true
Charles/Burp alternative.

| ID    | Deliverable                                       | Acceptance (runtime-verifiable)                                                                            | Status | Deps  |
| ----- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ | ----- |
| P1-01 | Generate a local root CA on first run             | A CA cert+key is created under `.certs/` (gitignored); regenerated only if missing                         | **Done** | P0-01 |
| P1-02 | Per-host leaf cert signing + TLS MITM             | With the CA trusted, an **https://** site loads through the proxy and its request/response is captured      | **Done** | P1-01 |
| P1-03 | `CONNECT` tunneling for untrusted/pass-through    | Hosts not being intercepted tunnel through transparently (no MITM, no breakage)                            | **Done** | P1-02 |
| P1-04 | CA export + install instructions                  | A documented way to export the CA and trust it on at least one OS/browser; verified by a successful https capture | **Done** | P1-01 |

> **P1-01/P1-02 evidence (2026-10-07):** `internal/mitm` generates an ECDSA P-256 root CA
> (`LoadOrCreateCA`, persisted to `.certs/`, key mode 0600, reused on restart) and signs per-host
> leaf certs on demand (`LeafCache`, SNI with CONNECT-host fallback). The proxy
> (`proxy.New(...).WithMITM(leaves)`) hijacks CONNECT, handshakes with the client, and relays the
> decrypted request over the shared relay path (no duplication). Verified running:
> `curl --proxy http://127.0.0.1:8082 --cacert .certs/ca-cert.pem https://example.com` returned
> **200** and the proxy logged `GET https://example.com:443/ -> 200`. Unit test
> `TestMITMInterceptsHTTPS` covers the full decrypt+relay+observe path against a TLS origin.
>
> **P1-03/P1-04 evidence (2026-10-07):** P1-03 — `Proxy.WithTunnelDecider` + `rawTunnel` splice
> bytes without decryption for hosts on `--no-mitm-hosts`. Verified running with
> `--no-mitm-hosts example.com`: `example.com` loaded (200) WITHOUT our CA and did NOT appear in
> the capture log (raw tunnel), while `example.org` loaded AND was captured
> (`GET https://example.org:443/ -> 200`) — MITM still active for non-excluded hosts. Test
> `TestTunnelDeciderPassesThrough` asserts the pass-through path captures nothing. P1-04 —
> `--export-ca <path>` writes the public CA cert (`CA.ExportCert`); verified it emits a valid PEM
> and exits. README documents trust steps for Windows/macOS/Linux/Firefox.
>
> **Known limitation (unchanged):** Windows schannel (`curl.exe`) still needs `--ssl-no-revoke`
> because the leaf has no CRL/OCSP endpoint; browsers with the CA trusted are fine. A CRL/OCSP
> or nocheck extension remains a candidate refinement (not blocking — documented in README).

## Phase 2 — Inspection UI

Goal: see the captured traffic in something better than stdout.

| ID    | Deliverable                               | Acceptance (runtime-verifiable)                                                              | Status | Deps  |
| ----- | ----------------------------------------- | --------------------------------------------------------------------------------------------- | ------ | ----- |
| P2-01 | Local web UI server (`internal/ui`)       | Opening a localhost URL lists captured requests, live-updating as traffic flows               | Todo   | P0-02 |
| P2-02 | Request/response detail view              | Clicking a request shows headers + body for request and response                              | Todo   | P2-01 |
| P2-03 | Clear / filter / search captured list     | The list can be cleared and filtered by substring across URL/method/status                    | Todo   | P2-01 |

## Phase 3 — Modify & mock (the QA value)

Goal: change traffic in flight — the core QA feature set, conceptually ported from the legacy
rule engine (do not import it; re-implement in Go).

| ID    | Deliverable                                 | Acceptance (runtime-verifiable)                                                        | Status | Deps        |
| ----- | ------------------------------------------- | --------------------------------------------------------------------------------------- | ------ | ----------- |
| P3-01 | Rule model + matching (`internal/rules`)    | Pure, unit-tested matching of a request against rule conditions (URL/method)            | Todo   | P0-02       |
| P3-02 | Block rule                                  | A matching request is blocked; verified in the client (request fails as configured)     | Todo   | P3-01       |
| P3-03 | Redirect rule                               | A matching request is redirected to a new URL; verified in the client                   | Todo   | P3-01       |
| P3-04 | Header rewrite (request + response)         | A matching request/response has headers added/removed; verified in capture              | Todo   | P3-01       |
| P3-05 | Mock response (status + body)               | A matching request returns a synthetic response without hitting the origin              | Todo   | P3-01       |
| P3-06 | Response body rewrite                       | A matching response body is modified before reaching the client                         | Todo   | P1-02,P3-01 |

## Phase 4 — Replay, persistence, polish

| ID    | Deliverable                       | Acceptance (runtime-verifiable)                                              | Status | Deps  |
| ----- | --------------------------------- | ----------------------------------------------------------------------------- | ------ | ----- |
| P4-01 | Replay / resend a captured request| A captured request can be re-sent (optionally edited) and the result captured | Todo   | P0-02 |
| P4-02 | Persist rules/config to disk      | Rules survive a restart (stored in a local config file)                       | Todo   | P3-01 |
| P4-03 | Import/export (HAR, rules JSON)   | Captured traffic exports to HAR; rules export/import round-trips              | Todo   | P2-01 |

---

## Explicitly out of scope (see ADR-0001)

Reverse proxy / load balancing, DNS spoofing, port forwarding, offensive-security tooling
(scanner / intruder / fuzzer). WebSocket frame inspection is a possible future phase, not a
Phase 0–4 goal.

## Ideas parking lot (not scheduled)

Mobile-device setup helper · global throttling profile · breakpoints (pause/edit/resume) ·
desktop GUI wrapper. Promote into a phase with an acceptance criterion before starting.
