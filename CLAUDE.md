# CLAUDE.md — QA.Interceptor Platform

This file points Claude (and any assistant) to the single source of truth.

**👉 Read [`AGENTS.md`](AGENTS.md) first — it is the full onboarding contract.**

## TL;DR

- The project is a **local HTTP(S) intercepting proxy written in Go** (not a browser extension —
  that old version is archived in `legacy/abandoned/`, read-only). See
  [`docs/adr/0001-why-proxy-and-go.md`](docs/adr/0001-why-proxy-and-go.md).
- Before any work, read: [`PROJECT_STATE.md`](PROJECT_STATE.md) → [`BACKLOG.md`](BACKLOG.md) →
  `docs/adr/*`.
- **Golden rule:** "Done" means verified running, not merely compiling.
- Validate every change: `go build ./...` · `go test ./...` · `go vet ./...` · `gofmt -l .` ·
  then run it and confirm the behavior.
- Update `PROJECT_STATE.md` and `BACKLOG.md` before finishing. One source of truth, one backlog —
  never create parallel docs.
