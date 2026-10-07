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
- ⬜ HTTPS MITM (Phase 1 — next), UI (Phase 2), rules/mocks (Phase 3) not started.

### What exists in code

- `internal/proxy/proxy.go` — `Proxy` (an `http.Handler`), `ListenAndServe`, the **`Observer`
  seam** (each `Exchange` = method, URL, status, duration, err), `StdoutLogger()`, and
  `MultiObserver(...)` to fan one exchange out to several observers. CONNECT (HTTPS) is cleanly
  refused with 501 until Phase 1.
- `internal/capture/capture.go` — `Store` implementing `proxy.Observer`: thread-safe, bounded,
  monotonic IDs, `List()`/`Len()`/`Clear()`. This is what the Phase 2 UI will read.
- `cmd/proxy/main.go` — wires `MultiObserver(StdoutLogger, store)`, `--port`, graceful shutdown,
  prints the capture count on exit.
- Tests: `internal/proxy/proxy_test.go`, `internal/capture/capture_test.go`.

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

**Task: start Phase 1 — HTTPS interception (MITM). Begin with P1-01, then P1-02.** This is the
hardest and most defining capability. Do it in the small ordered slices below; verify each at
runtime before moving on (golden rule).

Current relevant state:

- The proxy (`internal/proxy/proxy.go`) is a plain-HTTP forward proxy. A `CONNECT` request (how
  clients ask to tunnel HTTPS) is currently **refused with 501** — that refusal is the exact spot
  Phase 1 replaces.
- Captured exchanges already flow through the `Observer` seam into `internal/capture.Store`. HTTPS
  exchanges must land there too, in the same `Exchange` shape, so the UI (Phase 2) sees both.

Suggested slices (map to BACKLOG P1-01 → P1-04):

1. **P1-01 — local root CA.** New package `internal/mitm` (or `internal/ca`). On first run,
   generate an RSA/ECDSA root CA cert+key and persist under `.certs/` (already gitignored — the
   key must NEVER be committed). Reuse it if present. Unit-test that generation is deterministic
   in shape and that reload works.
2. **P1-02 — TLS MITM on CONNECT.** Replace the 501: on `CONNECT host:443`, hijack the client
   connection, send `200 Connection Established`, then TLS-handshake with the client using a leaf
   certificate signed on the fly by the root CA for that host (cache leaves per host). Then read
   the real HTTPS request over that TLS conn, relay it to the origin over TLS, copy the response
   back, and report an `Exchange` to the observer — same as the HTTP path. **Verify:** trust the
   CA locally, `curl -x http://127.0.0.1:8080 https://example.com` returns 200 and the exchange is
   captured. (Factor the HTTP relay logic so both paths share it; do not duplicate.)
3. **P1-03 — pass-through tunneling** for hosts you choose not to MITM: plain TCP splice between
   client and origin, no decryption. **Verify:** such a host still loads.
4. **P1-04 — CA export + trust instructions** documented and verified on at least one browser/OS.

Watch out for: a C compiler is NOT installed, so `go test -race` cannot run here — rely on
non-race concurrency tests. Keep `internal/capture` free of `net/http` server types; it only
depends on `internal/proxy`'s `Exchange`.

Validate every slice with: `go build ./...` · `go test ./...` · `go vet ./...` · `gofmt -l .` ·
then run it and confirm the behavior. Update this file + `BACKLOG.md` with evidence; commit.

## 7. How to run what exists today

```bash
go run ./cmd/proxy --port 8080
# then point an HTTP client at 127.0.0.1:8080, e.g.:
#   curl -x http://127.0.0.1:8080 http://example.com
# HTTPS does not work yet (Phase 1). Ctrl-C stops the proxy cleanly.
```
