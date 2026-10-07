# PROJECT_STATE — QA.Interceptor Platform

> **Single source of truth for the real state of the project.** Update this whenever you finish
> a task or change the architecture. Keep it honest: only list something as working if it was
> verified running (see the golden rule in `AGENTS.md`).

**Last updated:** 2026-10-02

---

## 1. What this project is

A local-first HTTP(S) intercepting proxy for QA and developers, written in **Go**. A lightweight
open-source alternative to Burp / Charles / Requestly / HTTP Toolkit. Everything runs locally.

Decision record: [`docs/adr/0001-why-proxy-and-go.md`](docs/adr/0001-why-proxy-and-go.md).

## 2. Current state (honest)

**Phase 0 in progress — the walking skeleton proxy works.**

- ✅ Old extension archived read-only in `legacy/abandoned/`.
- ✅ Repository foundation: `go.mod`, `.gitignore`, compass docs (`AGENTS.md`, `CLAUDE.md`,
  `KIRO.md`), steering (`.kiro/steering/project.md`), ADR-0001, this file, `BACKLOG.md`.
- ✅ Go 1.27 toolchain confirmed installed (`C:\Program Files\Go\bin\go.exe`).
- ✅ **P0-01 DONE (verified running):** forward HTTP proxy in `internal/proxy/proxy.go` +
  entry point `cmd/proxy/main.go`. A real request to `http://example.com` through
  `go run ./cmd/proxy` returned 200 and was logged. Tests green (`internal/proxy/proxy_test.go`).
- ✅ **P0-03 DONE:** `--port` flag + graceful SIGINT/SIGTERM shutdown in `main.go`.
- ✅ **P0-02 DONE (verified running):** `internal/capture.Store` — thread-safe, bounded
  in-memory store implementing `proxy.Observer`. 3 real requests captured through the running
  proxy (incl. an error exchange). Tests green incl. a 5000-write concurrency test.
- ✅ **Phase 0 complete.** The walking skeleton proxy captures traffic end to end.
- ✅ **P1-01 DONE (verified):** local ECDSA root CA in `internal/mitm` (`LoadOrCreateCA`),
  persisted to `.certs/` (gitignored, key 0600), reused on restart.
- ✅ **P1-02 DONE (verified running):** TLS MITM on CONNECT. `curl --cacert .certs/ca-cert.pem`
  loaded `https://example.com` through the proxy (HTTP 200) and it was captured as
  `GET https://example.com:443/ -> 200`. Per-host leaf signing with SNI + CONNECT-host fallback.
- ⬜ **P1-03 (pass-through tunneling) + P1-04 (CA export/trust docs) — next.**
- ⬜ UI (Phase 2), rules/mocks (Phase 3) not started.

> **Known limitation:** Windows `curl` (schannel) needs `--ssl-no-revoke` because our leaf has no
> CRL/OCSP endpoint; browsers with the CA installed are fine. Candidate refinement in P1-04.

### What exists in code

- `internal/proxy/proxy.go` — `Proxy` (an `http.Handler`), `ListenAndServe`, the **`Observer`
  seam** (each `Exchange` = method, URL, status, duration, err), `StdoutLogger()`, and
  `MultiObserver(...)` to fan one exchange out to several observers. CONNECT (HTTPS) is cleanly
  refused with 501 until Phase 1.
- `internal/capture/capture.go` — `Store` implementing `proxy.Observer`: thread-safe, bounded,
  monotonic IDs, `List()`/`Len()`/`Clear()`. This is what the Phase 2 UI will read.
- `internal/mitm/ca.go` — root CA generate/load/persist (`LoadOrCreateCA`, `CA.CertPEM`).
- `internal/mitm/leaf.go` — `LeafCache`: per-host leaf signing + `TLSConfigForHost(fallback)`.
- `internal/proxy/connwriter.go` — `connResponseWriter` so the MITM path reuses the same relay
  code as plain HTTP (writes a response back over the raw TLS conn).
- `cmd/proxy/main.go` — wires the CA + leaf cache + `MultiObserver(StdoutLogger, store)`, flags
  `--port` and `--cert-dir`, graceful shutdown, prints the capture count on exit.
- Tests: `internal/proxy/proxy_test.go`, `internal/proxy/mitm_test.go`,
  `internal/capture/capture_test.go`, `internal/mitm/ca_test.go`.

## 3. Architecture (target)

A single Go binary that runs a local proxy. Clients (browser, mobile, CLI) point at it. Captured
traffic is held in an in-memory store and surfaced to a UI. Rules/mocks modify traffic in flight.

```
cmd/proxy/            the proxy binary entry point
internal/
  proxy/              HTTP(S) interception core (listener, forwarding, MITM later)
  capture/            captured request/response store + domain types
  rules/              (later) rule matching + actions, ported conceptually from legacy
  mock/               (later) mock/stub responses
  ui/                 (later) local web UI server for inspection
docs/adr/             architecture decision records
legacy/abandoned/     old TS extension (READ ONLY)
```

Import direction stays one-way; `internal/capture` has no dependency on `internal/proxy`.

## 4. Build & verify

```bash
go build ./...
go test ./...
go vet ./...
gofmt -l .          # prints nothing when all files are formatted
go run ./cmd/proxy  # once P0-01 lands
```

## 5. What exists from the old project (reference only)

`legacy/abandoned/` contains the full TypeScript extension: a tested pure-logic rule engine,
shared types, the plain-TS side panel UI, and extensive (over-grown) documentation. **Do not
import or edit it.** Use it only to understand prior logic when porting a feature to Go.

## 6. Next step for the AI (read this if you are a new session)

**Task: finish Phase 1 — P1-03 (pass-through tunneling) and P1-04 (CA export + trust docs).**
HTTPS MITM already works (P1-02). Verify each slice at runtime before moving on (golden rule).

Current relevant state:

- `internal/proxy/proxy.go`: `handleConnect` MITM-intercepts every CONNECT when a `CertProvider`
  is set. `serveDecrypted` reads decrypted requests and reuses `serveRelayed` (shared with the
  plain-HTTP path — do not duplicate relay logic).
- `internal/mitm`: `LoadOrCreateCA` + `LeafCache.TLSConfigForHost`.

Slices:

1. **P1-03 — pass-through (no MITM) for selected hosts.** Not every host should be decrypted
   (e.g. a user allow/deny list, or hosts whose pinning breaks under MITM). Add a decision hook so
   `handleConnect` can choose: MITM (current behavior) OR raw tunnel. For raw tunnel: `net.Dial`
   the origin `host:port`, send `200 Connection Established`, then `io.Copy` both directions
   (client↔origin) until close — no TLS, no decryption, nothing captured. Start with a simple
   predicate (e.g. a `--no-mitm-hosts` comma list, or a `TunnelDecider` func on the Proxy).
   **Verify:** a host on the no-MITM list still loads through the proxy; a host not on it is still
   decrypted and captured.
2. **P1-04 — CA export + trust instructions.** Add a way to get the CA cert to the user (it is
   already at `.certs/ca-cert.pem`; consider a `--export-ca <path>` flag or just document the
   path) and write OS/browser trust steps in the README. **Verify:** after trusting the CA in a
   real browser, an https page loads and is captured. Consider addressing the schannel revocation
   limitation here (add a CRL Distribution Point or an OCSP-nocheck extension to leaves) so
   Windows curl/native clients work without `--ssl-no-revoke`.

Watch out for: a C compiler is NOT installed, so `go test -race` cannot run here. Keep
`internal/capture` free of `net/http` server types.

After Phase 1, the next milestone is **Phase 2 — the inspection UI (P2-01)**: a localhost web UI
that lists `capture.Store` records live. The store already exposes `List()` for exactly this.

Validate every slice with: `go build ./...` · `go test ./...` · `go vet ./...` · `gofmt -l .` ·
then run it and confirm the behavior. Update this file + `BACKLOG.md` with evidence; commit.

## 7. How to run what exists today

```bash
go run ./cmd/proxy --port 8080
# then point an HTTP client at 127.0.0.1:8080, e.g.:
#   curl -x http://127.0.0.1:8080 http://example.com
# HTTPS does not work yet (Phase 1). Ctrl-C stops the proxy cleanly.
```
