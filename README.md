# QA.Interceptor Platform

An open-source, local-first HTTP(S) interception toolkit for QA and developers — a lightweight
alternative to Burp Suite, Charles Proxy, Requestly, and HTTP Toolkit.

It runs as a **local proxy** on your machine. You point a browser, mobile device, or any HTTP
client at it, and you can inspect, modify, mock, and replay traffic — including HTTPS, via a
locally-generated certificate authority that never leaves your machine.

> **Status:** early rewrite. The project was previously a Manifest V3 browser extension
> (TypeScript). It is being rebuilt from scratch in **Go** as a local proxy to escape the
> platform limits of a browser extension (no WebSocket frames, no non-browser traffic, no real
> HTTPS MITM). The old code is archived read-only in [`legacy/abandoned/`](legacy/abandoned/).

## Why a proxy instead of a browser extension

A browser extension can only see and modify traffic the browser itself makes, and MV3 blocks
whole categories of interception (WebSocket frames, real response-body rewriting, anything
outside the browser). A local proxy sits below all of that: it can intercept any HTTP client on
the machine or network. See [`docs/adr/0001-why-proxy-and-go.md`](docs/adr/0001-why-proxy-and-go.md)
for the full decision.

## Project layout

```
cmd/            entry points (the proxy binary, future CLI/desktop)
internal/       application code, not importable by other modules
  proxy/        the HTTP(S) interception core
  capture/      captured-traffic store + types
  ...           (rules, mocks, UI server — added phase by phase)
docs/adr/       architecture decision records (the "why")
legacy/         the archived TypeScript extension (read-only history)
```

## Build & run

Requires **Go 1.27+**.

```bash
go build ./...        # compile everything
go test ./...         # run all tests
go run ./cmd/proxy    # start the proxy (once the proxy entry point exists)
```

## Working on this project (humans and AI)

Read these before touching code — they are the single source of truth:

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — what actually exists right now.
2. [`BACKLOG.md`](BACKLOG.md) — the one official backlog; pick the next task here.
3. [`AGENTS.md`](AGENTS.md) — the onboarding contract for any AI/human.

**Golden rule:** a task is only "Done" when it is verified running — not when it merely builds.

## License

See [`license`](license).
