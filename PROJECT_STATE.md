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
- ✅ **P1-03 DONE (verified):** pass-through tunneling. With `--no-mitm-hosts example.com`,
  `example.com` loaded without decryption (not captured) while `example.org` was still MITM'd.
- ✅ **P1-04 DONE (verified):** `--export-ca <path>` exports the CA cert; README documents trust
  steps for Windows/macOS/Linux/Firefox.
- ✅ **Phase 1 complete.** HTTP + HTTPS interception, pass-through, and CA trust all work.
- ⬜ UI (Phase 2 — next), rules/mocks (Phase 3) not started.

> **Known limitation:** Windows `curl` (schannel) needs `--ssl-no-revoke` because our leaf has no
> CRL/OCSP endpoint; browsers with the CA installed are fine. Documented in README; optional
> refinement later.

### What exists in code

- `internal/proxy/proxy.go` — `Proxy` (an `http.Handler`), `ListenAndServe`, the **`Observer`
  seam** (each `Exchange` = method, URL, status, duration, err), `StdoutLogger()`,
  `MultiObserver(...)`. CONNECT is MITM-intercepted via `WithMITM(certProvider)`; hosts rejected
  by `WithTunnelDecider(...)` are spliced raw by `rawTunnel`. The decrypted path reuses the plain
  relay (`serveRelayed`) — no duplication.
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

**Task: start Phase 2 — the inspection UI. Begin with P2-01, then P2-02, P2-03.** Phases 0 and 1
are complete: the proxy captures HTTP and HTTPS into `capture.Store`. The UI makes that visible.

Current relevant state:

- `internal/capture.Store.List()` returns `[]Record` (ID, Method, URL, StatusCode, Duration, Err,
  CapturedAt), oldest first, as a copy — safe to read while the proxy keeps capturing. This is the
  data source for the UI. The store is already wired in `cmd/proxy/main.go`.
- `Record` today does NOT include request/response headers or bodies. P2-02 (detail view) will
  need them — plan to extend `proxy.Exchange` + `capture.Record` to carry headers/body when you
  get there. Do that as its own small step so P2-01 (the list) ships first.

Slices (map to BACKLOG P2-01 → P2-03):

1. **P2-01 — local web UI server (`internal/ui`).** Add an HTTP server (separate port, e.g.
   `--ui-port 9090`) that serves a page listing captured requests from `store.List()`, refreshing
   live (simplest: a small HTML page that polls a JSON endpoint like `/api/requests` every second;
   avoid heavy frontend deps — plain HTML+JS served from Go, or `embed` a static file). Wire it in
   `main.go` alongside the proxy. **Verify:** start the proxy, browse some traffic, open the UI
   URL, and see the list grow.
2. **P2-02 — detail view.** Extend capture to store headers + bodies (see note above), and show
   them when a request is clicked. **Verify:** click a captured request, see its req/resp headers
   and body.
3. **P2-03 — clear / filter / search.** A clear button (calls `store.Clear()` via an endpoint) and
   substring filtering across URL/method/status. **Verify:** clear empties the list; filtering
   narrows it.

Design notes: keep UI/transport code in `internal/ui`; it may import `internal/capture`. Do NOT
make `internal/capture` depend on `net/http` server types. A C compiler is NOT installed, so
`go test -race` cannot run here.

Validate every slice with: `go build ./...` · `go test ./...` · `go vet ./...` · `gofmt -l .` ·
then run it and confirm the behavior in a browser. Update this file + `BACKLOG.md` with evidence;
commit.

## 7. How to run what exists today

```bash
go run ./cmd/proxy --port 8080
# then point an HTTP client at 127.0.0.1:8080, e.g.:
#   curl -x http://127.0.0.1:8080 http://example.com
# HTTPS does not work yet (Phase 1). Ctrl-C stops the proxy cleanly.
```
