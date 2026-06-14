# ADR-007: WebSocket Capture Feasibility (CAP-003)

<!-- markdownlint-disable MD040 -->

**Status**: Accepted
**Date**: 2026-06-14
**Author**: Developer Agent

---

## Context

`CAP-003` asks whether QA.Interceptor should capture WebSocket (WS/WSS) traffic in
addition to `fetch` and `XMLHttpRequest` (already covered by CAP-002). WebSocket is a
persistent, bidirectional, frame-based protocol — fundamentally different from the
request/response model the extension is built around.

We need an honest assessment of what Manifest V3 actually allows before committing
scope, so the backlog item stops being an open-ended "Todo".

### What MV3 can and cannot do with WebSocket

| Capability                            | Mechanism                                                 | Verdict                                     |
| ------------------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| Observe the WS **handshake** request  | `chrome.webRequest.onBeforeRequest` (`type: "websocket"`) | ✅ Possible (URL, timing, initiator)        |
| Block / redirect the handshake        | `declarativeNetRequest` rules                             | ✅ Possible (connection-level only)         |
| Read/modify **handshake** headers     | `webRequest` (observe) / DNR `modifyHeaders`              | ⚠️ Partial (no response-body; headers only) |
| Inspect **message frames** (payloads) | None at the network layer                                 | ❌ Not exposed by any extension API         |
| Modify / mock **message frames**      | None at the network layer                                 | ❌ Not exposed by any extension API         |

The browser deliberately does not surface WebSocket frame data to extensions through
`webRequest` or `declarativeNetRequest`. The handshake is an HTTP upgrade and is visible;
everything after the upgrade (the actual frames QA engineers care about) is not.

### The only way to see frames: in-page patching

The sole technique that exposes frame payloads is **patching the page's `WebSocket`
constructor** from a content script injected into the page's main world — exactly the
pattern already used in [`mock-bridge.ts`](../../extension/src/content/mock-bridge.ts)
for `fetch` and `XMLHttpRequest`. A patched `WebSocket` can:

- record outgoing frames by wrapping `WebSocket.prototype.send`;
- record incoming frames by listening on `message` / wrapping the `onmessage` setter;
- synthesize/mock frames by dispatching synthetic `MessageEvent`s;
- observe lifecycle via `open` / `close` / `error`.

This is the same trust boundary and the same delivery mechanism we already ship, so it
introduces **no new architectural primitive** — it reuses the injector → page-script →
`MOCK_APPLIED`/capture relay flow.

---

## Decision

1. **Keep CAP-003 OUT of the current milestone.** Network-layer WebSocket capture is
   impossible in MV3; only handshake metadata is available, which has low QA value on its
   own. We will not pursue a `webRequest`/DNR-based WebSocket feature.

2. **When prioritized, implement WebSocket support via in-page patching**, mirroring the
   existing fetch/XHR interception in `mock-bridge.ts`. This is the only approach that
   delivers the frame-level visibility QA engineers actually need.

3. **Reuse existing contracts.** Captured WS frames must flow through the same
   injector/relay path and be stored using a WebSocket-shaped extension of the existing
   capture model — not a parallel storage layer. No new rule engine; frame matching/mocking
   would extend the current pure-function modules.

4. **Scope guardrails for a future WS milestone** (non-binding sketch):
   - New rule types (e.g. `ws-mock-frame`, `ws-block`) defined in `shared-types`, not hardcoded.
   - Frame capture is opt-in (performance: high-frequency frames can flood storage; apply
     the same `MAX_CAPTURED_REQUESTS`-style cap and/or sampling).
   - Binary frames (`ArrayBuffer`/`Blob`) require an explicit encoding strategy before storage.

---

## Consequences

**Positive**

- The backlog item is resolved with an evidence-based verdict instead of staying open.
- No effort is wasted on a `webRequest`/DNR WebSocket feature that cannot read frames.
- A future implementation has a clear, architecture-consistent path (reuse mock-bridge
  pattern + existing contracts), avoiding a parallel subsystem.

**Negative / trade-offs**

- WebSocket traffic remains invisible to QA.Interceptor until a dedicated milestone is
  scheduled. This is an explicit, documented gap (tracked as risk R1's residual scope).
- In-page `WebSocket` patching shares the inherent limitations of page-world injection:
  it cannot see frames from workers/other origins it is not injected into, and pages can
  theoretically detect a patched constructor.

**Follow-up**

- `CAP-003` is marked **Done (decision recorded)** in `BACKLOG_CONSOLIDATED.md`; an
  implementation item (`CAP-005 — WebSocket frame capture via in-page patching`) is added
  to the Future Backlog for reprioritization.
- `PROJECT_STATE.md` risk R1 residual scope updated to reference this ADR.
