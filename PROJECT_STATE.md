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
- ✅ **P2-01 DONE (verified running):** `internal/ui` serves a live localhost web UI
  (`--ui-port`, default 9090) listing captured requests via a polled JSON API. After one HTTP +
  one HTTPS request, `/api/requests` returned both newest-first and the page rendered.
- ⬜ **P2-02 (detail view) + P2-03 (clear/filter/search) — next.**
- ⬜ Rules/mocks (Phase 3) not started.

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
- `internal/ui/ui.go` + `internal/ui/static/index.html` — the inspection UI: a `RecordSource`
  interface (satisfied by `*capture.Store`), a JSON `/api/requests` endpoint, and an embedded
  static page that polls it. `ListenAndServe(uiAddr, store)`.
- `cmd/proxy/main.go` — wires the CA + leaf cache + `MultiObserver(StdoutLogger, store)` + the UI
  server, flags `--port`, `--ui-port`, `--cert-dir`, `--export-ca`, `--no-mitm-hosts`, graceful
  shutdown of both servers.
- Tests: `internal/proxy/proxy_test.go`, `internal/proxy/mitm_test.go`,
  `internal/capture/capture_test.go`, `internal/mitm/ca_test.go`, `internal/ui/ui_test.go`.

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

**Task: continue Phase 2 — P2-02 (detail view) then P2-03 (clear/filter/search).** The live list
UI (P2-01) works. Now make each request inspectable, then manageable.

Current relevant state:

- `internal/ui/ui.go` serves `/api/requests` (JSON, newest first) and an embedded page
  (`static/index.html`) that polls it every 1s. Data comes from `RecordSource.List()`.
- `capture.Record` and `proxy.Exchange` currently carry only method/URL/status/duration/err —
  **no headers or bodies.** Adding those is the main work for P2-02.

Slices:

1. **P2-02 — detail view (the real work is plumbing headers/bodies through).**
   a. Extend `proxy.Exchange` with request headers, request body, response headers, response body.
      In `serveRelayed`, read the request body before relaying and restore it via
      `io.NopCloser(bytes.NewReader(...))` so the relay still sends it; read the response body
      after, then re-wrap it so it is still written to the client. **Bound stored body size**
      (e.g. first 256 KB) so memory stays sane. Mirror these fields onto `capture.Record`.
   b. Add `GET /api/requests/{id}` returning the full detail for one record (store needs a
      `Get(id)` or the UI can find it in `List()`).
   c. Make a row clickable to show a detail panel with req/resp headers + body.
   **Verify:** click a captured request in the browser; see headers and body for both sides.
2. **P2-03 — clear + filter + search.** Add `POST /api/clear` calling `store.Clear()` (extend the
   UI's source interface with `Clear()` or type-assert). Add a clear button and a search box that
   filters the rendered list by substring across URL/method/status (client-side over polled data
   is fine to start). **Verify:** clear empties the list; typing in search narrows it.

Design notes: keep server/transport code in `internal/ui` (may import `internal/capture`); do NOT
make `internal/capture` depend on `net/http`. Bound body capture for streamed/large responses. A
C compiler is NOT installed, so `go test -race` cannot run here.

After Phase 2, the next milestone is **Phase 3 — modify & mock (P3-01…)**: the QA value. The
legacy TS rule engine in `legacy/abandoned/` is a conceptual reference only; re-implement in Go.

Validate every slice with: `go build ./...` · `go test ./...` · `go vet ./...` · `gofmt -l .` ·
then run it and confirm the behavior in a browser. Update this file + `BACKLOG.md` with evidence;
commit.

## 7. How to run what exists today

```bash
go run ./cmd/proxy --port 8080 --ui-port 9090
# Proxy on 127.0.0.1:8080, inspection UI on http://127.0.0.1:9090.
# Point an HTTP client at the proxy:
#   curl -x http://127.0.0.1:8080 http://example.com
# For HTTPS, trust the CA (see README) then:
#   curl -x http://127.0.0.1:8080 --cacert .certs/ca-cert.pem https://example.org
#   (Windows curl.exe also needs --ssl-no-revoke)
# Ctrl-C stops both servers cleanly.
```
