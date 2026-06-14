# QA.Interceptor - AI Development Rules

> ## ⛔ MANDATORY ONBOARDING — READ BEFORE ANY WORK
>
> Before writing or changing ANY code, you MUST read, in order:
>
> 1. **`PROJECT_STATE.md`** (repo root) — real state, official architecture, what already exists.
> 2. **`BACKLOG_CONSOLIDATED.md`** (repo root) — the ONLY official backlog. Pick tasks from here.
> 3. **`AI_DEVELOPMENT_RULES.md`** (repo root) — rules to avoid duplication and rework.
>
> Do NOT trust historical docs in `docs/analysis/` or `docs/planning/` — they are dated snapshots.
> **Code is the primary evidence.** Update `PROJECT_STATE.md` and `BACKLOG_CONSOLIDATED.md` after finishing any task.
>
> Hard rules: UI is **plain TypeScript + DOM** (no React without an ADR). Six rule-engine
> modules are implemented but NOT wired (schema-validator, contract-comparator, conflict-detector,
> conditional-mock-evaluator, schema-inference, rule-index) — **connect them, do not recreate**.
> Validate every change with: `npm run build`, `cd extension && npx tsc -p tsconfig.json --noEmit`, `npm test`.

You are contributing to QA.Interceptor.

QA.Interceptor is an open-source browser extension focused on Quality Assurance and API testing.

The goal is not only intercepting requests.

The goal is helping QA Engineers validate:

* Frontend behavior
* Backend integrations
* API contracts
* Error scenarios
* Performance edge cases
* Mock responses
* Request manipulation

## Core Principles

1. Simplicity First

Every feature must be understandable by a QA analyst without developer knowledge.

2. QA Oriented

Features must solve real QA problems.

3. No Vendor Lock-In

The project must remain fully free.

4. Security First

Never collect user data.

Never send traffic to external services.

Everything runs locally.

5. Performance

The extension must not noticeably impact browser performance.

6. Maintainability

Prefer clean architecture.

Prefer composition over inheritance.

Prefer small modules.

## Coding Standards

* Use TypeScript.
* Avoid any.
* Follow SOLID principles.
* Follow Clean Code.
* Use ESLint.
* Use Prettier.
* Create unit tests whenever possible.

## Architecture

Follow feature-based architecture.

Example:

features/
├── interceptor
├── rules
├── mocks
├── history
├── exporter

Avoid creating large monolithic files.

## UX Principles

QA users must be able to create a rule in less than 30 seconds.

Every feature must prioritize usability over technical complexity.

## Future Vision

QA.Interceptor should become a lightweight alternative to:

* Requestly
* Charles Proxy
* Burp Suite Community

Focused on QA professionals.
