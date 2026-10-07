# AGENTS.md — QA.Interceptor Platform

> Entry point for ANY AI assistant or human developer (Claude, GPT, Gemini, Copilot, Cursor,
> Kiro, Codex, …). Read this first. It guarantees continuity across tools and sessions.
> `CLAUDE.md` and `KIRO.md` are thin pointers to this file.

## ⛔ Mandatory onboarding — read before any work

In order:

1. **`PROJECT_STATE.md`** — what actually exists right now (the real state, not aspirations).
2. **`BACKLOG.md`** — the ONLY official backlog. Pick the top unblocked task here.
3. **`docs/adr/*.md`** — the decisions already made and why. Do not re-litigate them.

Do **not** trust anything in `legacy/abandoned/`. That is the archived TypeScript extension,
kept read-only for reference. The live project is Go. **Code and the running binary are the
evidence.**

## The golden rule

> **"Done" means verified running — not merely compiling.**

The previous project failed because features were marked Done on a green build while being broken
in practice. A task is Done only when:

- `go build ./...` is green, **and**
- `go test ./...` is green, **and**
- the behavior is demonstrated at runtime (the proxy actually did the thing), with a note in
  `PROJECT_STATE.md` saying how it was verified.

If you cannot verify at runtime, mark it **In Progress / needs verification**, never Done.

## How to continue development (any tool, any session)

1. Open `BACKLOG.md`, pick the highest-priority unblocked task.
2. Confirm the real state in code before starting.
3. Implement the smallest slice that is runnable and demonstrable. Prefer a thin vertical slice
   that works end to end over a broad layer that doesn't run.
4. Validate: `go build ./...` · `go test ./...` · run it and confirm the behavior.
5. **Update `PROJECT_STATE.md` and `BACKLOG.md`** (status + evidence) before finishing.
6. Commit with a clear message.

## Validate every change

```bash
go build ./...
go test ./...
go vet ./...
gofmt -l .        # must print nothing (all files formatted)
```

## Non-negotiables

- **Language is Go.** No second language/runtime without a new ADR.
- **Local-first.** Everything runs on the user's machine. Never collect user data or send traffic
  to third parties. The generated MITM CA key never leaves the machine and is never committed.
- **One source of truth.** One `PROJECT_STATE.md`, one `BACKLOG.md`. Do **not** create parallel
  status docs or a second backlog. (The old project drowned in 16 markdown files — never again.)
- **No parallel implementations.** Before building something, check it does not already exist.
- **Architecture decisions go in `docs/adr/`** as a new numbered ADR, not inline in random docs.
- Keep `internal/` for app code; expose a package publicly only when something outside needs it.

## Repository map

```
cmd/<name>/        one entry point per binary
internal/          application packages (not importable externally)
docs/adr/          numbered architecture decision records
legacy/abandoned/  the old TS extension — READ ONLY, do not edit or import
AGENTS.md          this file
CLAUDE.md KIRO.md  pointers to this file
PROJECT_STATE.md   real current state
BACKLOG.md         the one official backlog
```
