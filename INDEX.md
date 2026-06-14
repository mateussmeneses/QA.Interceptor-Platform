# QA.Interceptor Platform — Documentation Index

This is the central entry point for the project documentation.

> **Start here (single source of truth, repo root):**
>
> 1. **[PROJECT_STATE.md](PROJECT_STATE.md)** — real state + official architecture.
> 2. **[BACKLOG_CONSOLIDATED.md](BACKLOG_CONSOLIDATED.md)** — the only official backlog.
> 3. **[AI_DEVELOPMENT_RULES.md](AI_DEVELOPMENT_RULES.md)** — rules for any AI/developer session.
>
> Onboarding hooks for AI tools: **[AGENTS.md](AGENTS.md)**, **[CLAUDE.md](CLAUDE.md)**,
> **[.github/copilot-instructions.md](.github/copilot-instructions.md)**.

---

## Governance & quality

- **[ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md)** — architecture findings and target.
- **[TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)** — debt register.
- **[REFACTORING_PLAN.md](REFACTORING_PLAN.md)** — remove/fix/rewrite plan.
- **[PROJECT_RULES.md](PROJECT_RULES.md)** — non-negotiable project rules.
- **[PRODUCT_VISION.md](PRODUCT_VISION.md)** — product vision and goals.
- **[MANIFEST.md](MANIFEST.md)** — manifesto and principles.
- **[README.md](README.md)** — project overview.

---

## Architecture & design (current)

- **[docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)** — system layers.
- **[docs/adr/](docs/adr/)** — Architecture Decision Records (ADR-001..006).

> Note: the former `FRONTEND_*` and `DESIGN_SYSTEM*` documents describe the **removed**
> React component layer and now live under `docs/_archive/architecture/` as historical references.

---

## Reference & guides

- **[docs/reference/CONTRIBUTING.md](docs/reference/CONTRIBUTING.md)** — contribution guide + language policy.
- **[docs/reference/VERSIONING.md](docs/reference/VERSIONING.md)** — versioning policy.
- **[docs/reference/DOCUMENTATION_STRUCTURE.md](docs/reference/DOCUMENTATION_STRUCTURE.md)** — document ownership.
- **[docs/planning/ROADMAP.md](docs/planning/ROADMAP.md)** — phased roadmap (high-level).
- **[docs/requestly-benchmark-analysis.md](docs/requestly-benchmark-analysis.md)** — benchmark analysis.

---

## Archived (historical, read-only)

Dated snapshots that **do not match the current code** live in
**[docs/\_archive/](docs/_archive/README.md)** (analysis, planning, superseded backlogs, frontend
design docs, PT summary). Do not use them for active development.

---

## Directory structure

```
QA.Interceptor Platform/
├── PROJECT_STATE.md            # source of truth — real state + architecture
├── BACKLOG_CONSOLIDATED.md     # the only official backlog
├── AI_DEVELOPMENT_RULES.md     # rules for AI/dev sessions
├── AGENTS.md / CLAUDE.md       # AI onboarding hooks
├── ARCHITECTURE_REVIEW.md · TECHNICAL_DEBT.md · REFACTORING_PLAN.md
├── README.md · PRODUCT_VISION.md · PROJECT_RULES.md · MANIFEST.md · QUICK_REFERENCE.md
│
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   ├── architecture/           # ARCHITECTURE.md
│   ├── planning/               # ROADMAP.md
│   ├── reference/              # CONTRIBUTING, VERSIONING, DOCUMENTATION_STRUCTURE
│   ├── requestly-benchmark-analysis.md
│   └── _archive/               # historical, read-only (analysis, planning, backlogs, frontend)
│
├── extension/                  # MV3 extension source (background, content, sidepanel, storage)
└── packages/
    ├── shared-types/           # domain types + message contracts
    └── rule-engine/            # pure logic + tests
```
