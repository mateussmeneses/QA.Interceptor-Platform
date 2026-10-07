# QA.Interceptor Platform

Open-source traffic interception platform focused on QA workflows.

## Current Status

Functional MVP (Manifest V3 browser extension). See [PROJECT_STATE.md](PROJECT_STATE.md) for the verified state.

## Build & load in Chrome

```bash
npm install        # required after cloning or moving the repo (recreates workspace links)
npm run build      # outputs a complete, loadable extension into extension/dist/
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select the **`extension/dist`** folder (not `extension/`, and not the repo root).

`extension/dist/` is self-contained: the build copies `manifest.json` into it and
rewrites the asset paths, so it loads directly. After changing source, re-run
`npm run build` and click the reload icon on the extension card.

> If `npm run build` fails right after reopening the project, run `npm install` first —
> the build guard will tell you when the workspace links are stale.

## Product Goal

Help QA professionals validate frontend behavior, backend integrations, API contracts, and failure scenarios without expensive or complex tooling.

## MVP Scope (Browser Extension)

- Request and response capture
- Rule Engine foundation
- Rewrite rules (URL, headers)
- Mock rules (static response, status code)
- Side Panel UI for inspection and rule management

## Documentation Map

**👉 [Central navigation: INDEX.md](INDEX.md)** — use this file as the entry point for all documentation.

Quick links:

- Source of truth: [PROJECT_STATE.md](PROJECT_STATE.md)
- Official backlog: [BACKLOG_CONSOLIDATED.md](BACKLOG_CONSOLIDATED.md)
- AI/dev rules: [AI_DEVELOPMENT_RULES.md](AI_DEVELOPMENT_RULES.md)
- Vision and value: [PRODUCT_VISION.md](PRODUCT_VISION.md)
- Non-negotiable rules: [PROJECT_RULES.md](PROJECT_RULES.md)
- Architecture baseline: [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)
- Milestones and phases: [docs/planning/ROADMAP.md](docs/planning/ROADMAP.md)
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
