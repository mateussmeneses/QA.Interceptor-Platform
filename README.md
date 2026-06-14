# QA.Interceptor Platform

Open-source traffic interception platform focused on QA workflows.

## Current Status

This repository is in planning-first stage. Core documents are defined and aligned for MVP execution.

## Product Goal

Help QA professionals validate frontend behavior, backend integrations, API contracts, and failure scenarios without expensive or complex tooling.

## MVP Scope (Browser Extension)

- Request and response capture
- Rule Engine foundation
- Rewrite rules (URL, headers)
- Mock rules (static response, status code)
- Side Panel UI for inspection and rule management

## Documentation Map

**👉 [Navegação centralizada: INDEX.md](INDEX.md)** - Use este arquivo como ponto de entrada para toda documentação.

Quick links:
- Vision and value: [PRODUCT_VISION.md](PRODUCT_VISION.md)
- Non-negotiable rules: [PROJECT_RULES.md](PROJECT_RULES.md)
- Architecture baseline: [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)
- Milestones and phases: [docs/planning/ROADMAP.md](docs/planning/ROADMAP.md)
- Prioritized work items: [docs/backlog/BACKLOG.md](docs/backlog/BACKLOG.md)
- Contribution workflow: [docs/reference/CONTRIBUTING.md](docs/reference/CONTRIBUTING.md)
- Versioning policy: [docs/reference/VERSIONING.md](docs/reference/VERSIONING.md)
- Project principles manifesto: [MANIFEST.md](MANIFEST.md)

## Suggested MVP Workspace Structure

```text
extension/
  src/
    background/
    content/
    sidepanel/
    popup/
    rules/
    network/
  manifest.json
packages/
  rule-engine/
  shared-types/
```

## MVP Kickoff Plan

1. Create extension shell with Manifest V3.
2. Implement request and response capture pipeline.
3. Build Rule Engine contracts and execution flow.
4. Add first two rewrite rules and first two mock rules.
5. Add minimal side panel for traffic and rule toggling.

## Contribution

Read `CONTRIBUTING.md` before opening pull requests.
