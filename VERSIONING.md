# Versioning Policy

This project uses Semantic Versioning (SemVer): MAJOR.MINOR.PATCH.

## Bump Rules

- MAJOR: breaking or incompatible behavior changes.
- MINOR: new backward-compatible features.
- PATCH: backward-compatible bug fixes and maintenance updates.

## Commit to Version Mapping

- feat: MINOR
- fix: PATCH
- perf: PATCH
- refactor (no breaking change): PATCH
- docs, test, chore, ci, build: no required bump by themselves unless bundled in a release

Any commit marked with breaking change marker forces MAJOR bump:

- type(scope)!: summary
- BREAKING CHANGE: description

## Examples

- 0.4.2 -> 0.4.3 for a bug fix
- 0.4.2 -> 0.5.0 for a new backward-compatible feature
- 0.4.2 -> 1.0.0 for a breaking change
