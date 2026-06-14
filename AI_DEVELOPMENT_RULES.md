# AI_DEVELOPMENT_RULES — QA.Interceptor Platform

> Mandatory rules for any AI session (Copilot, Claude, GPT, Gemini, Cursor, etc.) or human
> developer working in this repository. The goal is to avoid rework, duplicated code, and
> parallel implementations — real problems already found in this project.

---

## 0. Before any work (mandatory gate)

1. **Read `PROJECT_STATE.md`** — understand the real state, the official architecture, and what already exists.
2. **Read `BACKLOG_CONSOLIDATED.md`** — it is the **only** official backlog. Do not use others.
3. **Do not trust historical docs** (`docs/analysis/*`, `docs/planning/*`): they are dated
   snapshots and may contradict the code. **Code is the primary evidence.**

---

## 1. Before creating any feature

- **Check whether it already exists.** Search `packages/rule-engine/src`, `extension/src`, and
  `BACKLOG_CONSOLIDATED.md`. Several engines are implemented but **not wired**
  (schema-validator, contract-comparator, conflict-detector, conditional-mock-evaluator,
  schema-inference). **Wire what exists; do not recreate.**
- **Never create a parallel implementation** for something that already exists (this was the
  root cause of the dead React layer and the two concurrent rule engines).
- **Prioritize reuse** before creating a new module, component, or utility.

---

## 2. Architecture — do not violate

- **UI is plain TypeScript + DOM.** **Reintroducing React is forbidden** without a new approved ADR.
- **Pure logic goes in `rule-engine`** (no `chrome`/`window`/DOM). Everything tested.
- **Domain types live in `shared-types`.** Do not redefine `Rule`, `RuleCondition`,
  `MockEnvVar`, etc. locally — import them.
- **Storage only via `extension/src/storage/index.ts`.**
- **Only one rule engine:** `evaluateRules`. Do not create concurrent engines.
- **No circular dependencies.** Direction: `shared-types ← rule-engine ← extension`.

---

## 3. Backlog and documentation

- **Never create a new backlog.** Update `BACKLOG_CONSOLIDATED.md`.
- **No task may exist in more than one place.** IDs are unique.
- **A task is "Done" only with evidence:** code + green build + green test/typecheck.
  Layout/skeleton = "In Progress". Unwired engine = "Engine ready / not wired".
- **Update `PROJECT_STATE.md`** after finishing any feature or architectural change.
- Documents in `docs/analysis/`, `docs/planning/`, and old backlogs are **read-only history**.

---

## 4. Code quality

- Apply **DRY, KISS, and SOLID**. Prefer composition over inheritance. Small modules.
- **Avoid code duplication.** If you copy logic, stop and extract it into a shared module.
- Strict TypeScript. **Avoid `any`.** Validate only at system boundaries.
- **Do not** add comments/docstrings/types to code you did not change.
- **Do not** create helpers/abstractions for one-time use.
- **Do not** add error handling for impossible scenarios.

---

## 5. Mandatory validation before finishing

Run and ensure green:

```
npm run build         # build extension + packages
npm test              # rule-engine tests (vitest)
cd extension && npx tsc -p tsconfig.json --noEmit   # FULL typecheck must pass
```

If you add pure logic to `rule-engine`, **add tests** (`*.test.ts`).

---

## 6. Security and scope

- Everything runs **locally**. **Never** collect user data or send traffic to external services.
- HTML is built via string concatenation: **always** use `escapeHtml` on dynamic data.
- Do not change `manifest.json` (permissions) without a documented security justification.

---

## 7. Anti-patterns already committed in this project (do not repeat)

| Anti-pattern | What happened | Rule |
| --- | --- | --- |
| Parallel implementation | An entire React layer created without wiring to runtime (~3,300 dead lines) | Never two UIs/stacks |
| Concurrent engine | `rule-index.ts` duplicated `evaluateRules` without replacing it | One engine only |
| Type copies | `Rule`/`MockEnvVar` redefined in 4 places | Import from `shared-types` |
| Duplicated parsers | `storage-parsers.ts` copied `storage/index.ts` | Single source |
| "Done" without execution | Engines marked Done but never wired | Done = runs at runtime |
| Multiple backlogs | 5 backlogs with divergent statuses | One backlog only |
