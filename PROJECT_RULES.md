# QA.Interceptor Platform Project Rules

## Scope Rules

- MVP target is browser extension (Manifest V3).
- Architecture must preserve future desktop compatibility.
- Features must solve explicit QA use cases.

## Architecture Rules

- Architecture-first decisions over implementation shortcuts.
- No request manipulation may bypass Rule Engine.
- Rule Engine is mandatory integration point for rewrite, mock, redirect, block, delay, compose, and repeat capabilities.
- Prefer modular feature boundaries and avoid monolithic files.

## Security Rules

- No user data collection.
- No telemetry by default.
- Local-first execution.
- No traffic forwarding to third-party services by default.

## Performance Rules

- Minimal browser runtime impact.
- Lazy loading for non-critical modules.
- Rule matching and transformation paths must be optimized for frequent requests.

## Engineering Rules

- TypeScript-first implementation.
- Avoid `any` unless a documented exception exists.
- Follow SOLID and clean code principles.
- New behavior should include test coverage whenever practical.
- Zero-warning quality bar: warnings, deprecated APIs/options, and known static-analysis advisories must be treated as issues to fix, not to ignore.
- Keep dependencies on latest stable versions whenever practical; if an update is intentionally deferred, document the reason and create a backlog item.
