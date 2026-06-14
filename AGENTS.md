# AGENTS.md — QA.Interceptor Platform

> This file is the entry point for ANY AI agent or coding assistant
> (Copilot, Claude, GPT, Gemini, Cursor, Windsurf, Codex, etc.) and for Copilot's auto mode.
> It guarantees development continuity across tools and sessions.

## ⛔ Mandatory onboarding — read before any work

Read these files at the repository root, in order, before writing or changing any code:

1. **`PROJECT_STATE.md`** — real project state, official architecture, what already exists.
2. **`BACKLOG_CONSOLIDATED.md`** — the ONLY official backlog. Choose your next task here.
3. **`AI_DEVELOPMENT_RULES.md`** — rules to avoid duplication, rework, and parallel implementations.

Supporting references (read when relevant): `ARCHITECTURE_REVIEW.md`, `TECHNICAL_DEBT.md`,
`REFACTORING_PLAN.md`, and `docs/adr/*.md`.

## How to continue development (any tool, any session)

1. Open `BACKLOG_CONSOLIDATED.md` and pick the highest-priority `Todo`/`In Progress` item
   (current top: **INT-004**, then **FIX-001/FIX-002**, then **INT-001..006**).
2. Confirm the real state in code before starting — never trust historical docs.
3. Implement following `AI_DEVELOPMENT_RULES.md`.
4. Validate: `npm run build` · `cd extension && npx tsc -p tsconfig.json --noEmit` · `npm test` (must be green; 578 tests).
5. **Update `BACKLOG_CONSOLIDATED.md` (status) and `PROJECT_STATE.md`** before finishing.

## Non-negotiables

- UI = **plain TypeScript + DOM**. No React without a new ADR.
- One rule engine (`evaluateRules`); one storage layer (`storage/index.ts`); types from `shared-types`.
- Six engines are implemented but **not wired** — connect (INT-001..006), do not recreate.
- Everything runs locally. Never collect user data or send traffic externally.
- Do not create new backlog files. There is exactly one official backlog.
