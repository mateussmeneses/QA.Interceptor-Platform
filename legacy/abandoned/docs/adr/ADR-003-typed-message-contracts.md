# ADR-003: Typed Runtime Message Contracts

**Status**: Accepted  
**Date**: 2026-06-12  
**Author**: Architect Agent

---

## Context

Browser extensions communicate across contexts (background service worker, content scripts, sidepanel) via `chrome.runtime.sendMessage`. Without typed contracts:

- Both sender and receiver must independently agree on payload shape — coupling through convention.
- `JSON.parse` returns `unknown`; incorrect assumptions about payload shape cause silent runtime failures.
- Adding a new message type requires finding all call sites manually — no compiler assistance.

The system uses four message types: `repeat-request`, `mock-bridge-init`, `mock-bridge-response`, and `rule-engine-eval`.

---

## Decision

Define all message types in `extension/src/messages.ts` using a **discriminated union** pattern:

```typescript
export type ExtensionMessage =
  | RepeatRequestMessage
  | MockBridgeInitMessage
  | MockBridgeResponseMessage
  | RuleEngineEvalMessage;
```

Each member has a `type` string literal as the discriminant. Type guards (`isRepeatRequestMessage`, etc.) validate incoming `unknown` payloads at extension boundaries.

**Constraints**:

1. All `chrome.runtime.sendMessage` calls must use a type from `ExtensionMessage`.
2. All `chrome.runtime.onMessage` handlers must validate via the type guard before casting.
3. New message types require updating `ExtensionMessage`, adding a guard, and documenting in this file.
4. Payload types are kept flat — no nested discriminated unions to avoid runtime guard complexity.

---

## Consequences

**Positive**:

- TypeScript enforces payload shape at call sites — no silent mismatches.
- `switch (message.type)` is type-narrowed — each case has the correct payload type.
- New contributors can enumerate all message types from a single file.
- No runtime `any` — all runtime validation is explicit and testable.

**Negative / Trade-offs**:

- Requires updating `messages.ts` whenever a new cross-context interaction is introduced.
- Type guards are boilerplate. Justified because chrome.runtime bypasses TypeScript's type system.

**Future consideration**:

- If message count exceeds ~12, split `messages.ts` by context (`background-messages.ts`, `content-messages.ts`).
