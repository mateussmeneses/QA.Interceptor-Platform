# KIRO.md — QA.Interceptor Platform

This file points Kiro (and any assistant) to the single source of truth.

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

## Kiro specifics

- Workspace root: `c:\projetos\fork\qa.interceptor-platform` (no spaces — keep it that way).
- Go is installed at `C:\Program Files\Go\bin\go.exe` (Go 1.27). If `go` is not on a fresh
  terminal's PATH, open a new terminal or call it by full path.
- There is also a steering file at `.kiro/steering/project.md` with the same rules, applied
  automatically in Kiro sessions.
