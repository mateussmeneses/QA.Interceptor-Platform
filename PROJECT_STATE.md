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
- ⬜ **P0-02 TODO:** in-memory capture store (`internal/capture`). This is the next task.
- ⬜ HTTPS MITM (Phase 1), UI (Phase 2), rules/mocks (Phase 3) not started.

### What exists in code

- `internal/proxy/proxy.go` — `Proxy` (an `http.Handler`), `ListenAndServe`, and an **`Observer`
  seam**: the proxy reports each `Exchange` (method, URL, status, duration, err) to an `Observer`.
  `StdoutLogger()` is the only implementation so far. CONNECT (HTTPS) is cleanly refused with 501
  until Phase 1.
- `cmd/proxy/main.go` — wires `StdoutLogger`, `--port`, graceful shutdown.
- `internal/proxy/proxy_test.go` — full relay+observe test and a CONNECT-refused test.

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

**Task: implement P0-02 — in-memory capture store (`internal/capture`).**

Context so you don't get lost:

- The proxy already emits every exchange through the `proxy.Observer` interface
  (`internal/proxy/proxy.go`). `StdoutLogger()` is one observer. **Do not change the proxy to add
  capture** — instead build the store as a *second* observer.
- Create package `internal/capture` with a `Store` that implements `proxy.Observer` (i.e. has an
  `Observe(proxy.Exchange)` method), keeps records in memory (thread-safe — the proxy serves
  concurrently, so guard with a mutex), assigns each an ID + timestamp, and exposes a `List()`
  (or similar) read method. Add a bound/cap so memory can't grow forever.
- Wire it in `cmd/proxy/main.go`: construct the store, pass it (alongside or instead of the
  stdout logger) to `ListenAndServe`. If you want both logging and capture, add a small
  multi-observer helper, or have `main` fan out — keep it simple.
- **Acceptance (golden rule):** unit-test the store (concurrent writes, ordering, cap). Then run
  the proxy, send a couple of requests through it, and confirm they are captured (e.g. a temporary
  stdout dump of `Store.List()` on shutdown, or a tiny debug print). Record the evidence in this
  file and flip P0-02 to Done in `BACKLOG.md`.

Validate with: `go build ./...` · `go test ./...` · `go vet ./...` · `gofmt -l .` · run it.

After P0-02, the next milestone is **Phase 1 (HTTPS MITM, P1-01 → P1-04)** — the defining
capability. Capture (P0-02) is a prerequisite for the UI (Phase 2).

## 7. How to run what exists today

```bash
go run ./cmd/proxy --port 8080
# then point an HTTP client at 127.0.0.1:8080, e.g.:
#   curl -x http://127.0.0.1:8080 http://example.com
# HTTPS does not work yet (Phase 1). Ctrl-C stops the proxy cleanly.
```
