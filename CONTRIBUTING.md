# Contributing

## Language Policy

English is the official project language for source code, comments, commits, pull requests, issues, and documentation.

## Branch Naming

- `feature/*`
- `bugfix/*`
- `hotfix/*`
- `docs/*`
- `chore/*`

## Commit Convention

This project follows Conventional Commits and validates commit messages via Husky + Commitlint.

Allowed commit types:

- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `test:`
- `chore:`
- `build:`
- `ci:`
- `perf:`
- `revert:`

Examples:

- `feat(network): add repeat request action`
- `fix(rules): handle empty rewrite payload`
- `chore(repo): configure husky and commitlint`

Breaking changes must use `!` after type/scope or include `BREAKING CHANGE:` in the commit body.

## Semantic Versioning (SemVer)

This repository uses SemVer in the form `MAJOR.MINOR.PATCH`.

- MAJOR: incompatible public behavior change or breaking API contract.
- MINOR: backward-compatible new functionality.
- PATCH: backward-compatible bug fix or internal correction.

Recommended mapping from commit intent to release bump:

- `feat` -> MINOR
- `fix`, `perf`, `refactor` (without breaking change) -> PATCH
- Any commit with breaking change marker (`!` or `BREAKING CHANGE:`) -> MAJOR

## Pull Request Checklist

All pull requests must:

- Build successfully
- Pass relevant tests
- Follow architecture and project rules
- Include clear scope and rationale in description
- Avoid unrelated changes in the same PR

## Coding Standards

- TypeScript
- ESLint
- Prettier
- SOLID
- Clean Code
- Small modules and explicit boundaries

Pre-commit quality gate is enforced with Husky + lint-staged (ESLint and Prettier on staged files).

## Before Starting Work

1. Read `PROJECT_RULES.md` and `ARCHITECTURE.md`.
2. Check `ROADMAP.md` and `BACKLOG.md` for priorities.
3. Confirm the feature maps to a QA workflow.
