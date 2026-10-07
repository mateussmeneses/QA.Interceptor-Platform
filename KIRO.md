# KIRO.md — QA.Interceptor Platform

This file points Kiro (and any assistant) to the single source of truth.
**See `AGENTS.md` for the full onboarding contract.**

## ⛔ Read before any work (repo root)

1. `PROJECT_STATE.md` — real state + official architecture.
2. `BACKLOG_CONSOLIDATED.md` — the ONLY official backlog; pick your task here.
3. `AI_DEVELOPMENT_RULES.md` — anti-duplication / anti-rework rules.
4. `RUNTIME_AUDIT.md` — the honest, runtime-verified status of each feature.

Do not trust historical docs in `docs/_archive/`. **Code is the evidence, and the Chrome
runtime is the final judge.** A green test does not mean the feature works end to end.

## First commands when (re)opening the project

```bash
npm install        # REQUIRED after cloning/moving the repo — recreates workspace symlinks
npm run build      # builds packages then extension into extension/dist/
```

If `npm run build` fails right after reopening with `TS2307: Cannot find module
'@qa-interceptor/...'`, the workspace symlinks are stale — run `npm install`. The
`prebuild` guard (`scripts/check-workspace-links.mjs`) detects this and tells you.

## Load the extension in Chrome

1. `npm run build`
2. `chrome://extensions` → enable **Developer mode**
3. **Load unpacked** → select **`extension/dist`** (NOT `extension/`, NOT the repo root)
4. After editing source: re-run `npm run build`, then click reload on the extension card.

`extension/dist/` is self-contained — the build copies `manifest.json` into it and strips
the `dist/` path prefix so Chrome loads it directly.

## Validate every change (all must be green)

```bash
npm run build
cd extension && npx tsc -p tsconfig.json --noEmit
npm test                 # rule-engine + extension pure-utils suites
npm run lint             # eslint, zero warnings
npm run format:check     # prettier
```

## The "Done ≠ works" rule (why RUNTIME_AUDIT.md exists)

This project historically marked features "Done" on the strength of a passing build and
unit tests. But ~7,800 lines of DOM/Chrome wiring (`sidepanel/features/*`, `background`,
`content`) have **no unit tests** by design — so a feature can be "Done" on paper and still
be broken in the browser. **When you touch or claim a feature, verify it in the loaded
extension and record the result in `RUNTIME_AUDIT.md`.** Only runtime-verified features are
truly Done.

## Non-negotiables

- UI = plain TypeScript + DOM. **No React** without a new ADR.
- One rule engine (`evaluateRules`), one storage layer (`storage/index.ts`), types from
  `shared-types`. Do not create parallel implementations.
- Everything runs locally. Never collect user data or send traffic externally.
- Do not create new backlog files — there is exactly one official backlog.
- Update `PROJECT_STATE.md`, `BACKLOG_CONSOLIDATED.md`, and `RUNTIME_AUDIT.md` after
  finishing any task.
