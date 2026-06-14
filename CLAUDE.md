# CLAUDE.md — QA.Interceptor Platform

This file points Claude (and any assistant) to the single source of truth.
**See `AGENTS.md` for the full onboarding contract.**

## ⛔ Read before any work (repo root)

1. `PROJECT_STATE.md` — real state + official architecture.
2. `BACKLOG_CONSOLIDATED.md` — the ONLY official backlog; pick your task here.
3. `AI_DEVELOPMENT_RULES.md` — anti-duplication / anti-rework rules.

Do not trust historical docs in `docs/analysis/` or `docs/planning/`. Code is the evidence.

## Validate every change

```
npm run build
cd extension && npx tsc -p tsconfig.json --noEmit
npm test            # 578 tests must stay green
```

## Non-negotiables

UI = plain TypeScript + DOM (no React without an ADR). Six rule-engine modules are
implemented but NOT wired — connect them (INT-001..006), do not recreate. One rule engine,
one storage layer, types from `shared-types`. Update `PROJECT_STATE.md` and
`BACKLOG_CONSOLIDATED.md` after finishing any task.
