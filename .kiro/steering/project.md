# QA.Interceptor Platform — project rules (always applied)

This project is a **local HTTP(S) intercepting proxy written in Go** (Burp/Charles/Requestly/
HTTP Toolkit alternative). It is NOT a browser extension — the old TypeScript MV3 extension is
archived read-only in `legacy/abandoned/` and must not be edited or imported. See
`docs/adr/0001-why-proxy-and-go.md`.

## Before any work

Read, in order: `PROJECT_STATE.md` → `BACKLOG.md` → `docs/adr/*`. `AGENTS.md` is the full
onboarding contract. Code and the running binary are the evidence — not the docs, and never
`legacy/`.

## The golden rule

A task is **Done** only when it is verified running: `go build ./...` green, `go test ./...`
green, AND the behavior demonstrated at runtime, with a note in `PROJECT_STATE.md` on how it was
verified. If you can't verify at runtime, it is "Needs verification", not Done.

## Non-negotiables

- Language is Go. No second language/runtime without a new ADR.
- Local-first: never collect user data or send traffic to third parties. The generated MITM CA
  key never leaves the machine and is never committed (it is gitignored under `.certs/`).
- One `PROJECT_STATE.md`, one `BACKLOG.md`. Never create parallel status docs or a second
  backlog. The previous project drowned in 16 markdown files — do not repeat that.
- No parallel implementations: check a thing doesn't already exist before building it.
- App code lives in `internal/`; entry points in `cmd/<name>/`. Architecture decisions go in
  `docs/adr/` as a new numbered ADR.
- Prefer thin vertical slices that run end to end over broad layers that don't execute.

## Validate every change

`go build ./...` · `go test ./...` · `go vet ./...` · `gofmt -l .` (must print nothing) · then
run it. Update `PROJECT_STATE.md` and `BACKLOG.md` before finishing. Commit with a clear message.

## Environment

Workspace root `c:\projetos\fork\qa.interceptor-platform` (no spaces — keep it). Go 1.27 at
`C:\Program Files\Go\bin\go.exe`; if `go` isn't on a fresh terminal's PATH, open a new terminal
or use the full path.
