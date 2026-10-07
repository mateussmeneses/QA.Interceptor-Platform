# ADR-0001 — Rebuild as a local proxy in Go

- **Status:** Accepted
- **Date:** 2026-10-02
- **Supersedes:** the entire Manifest V3 browser-extension architecture (archived in `legacy/abandoned/`)

## Context

The first incarnation of this project was a Chrome Manifest V3 (MV3) browser extension written in
TypeScript. It reached a functional MVP with a tested pure-logic core, but:

- MV3 **cannot** read WebSocket frames at the network layer, cannot reliably rewrite response
  bodies, and can only touch traffic the browser itself makes. The old backlog already listed SSL
  proxying, DNS, reverse proxy, and non-browser capture as permanently out of scope.
- The product goal is explicitly a lightweight alternative to **Burp Suite, Charles Proxy,
  Requestly, and HTTP Toolkit** — all of which are, at their core, local intercepting proxies.
- The extension accumulated documentation drift and "Done-but-not-working" features, which eroded
  trust and stalled progress.

A local intercepting proxy sits below the browser and below individual applications. It can
observe and modify any HTTP(S) client on the machine (or network), including mobile devices
pointed at it, and it can do real HTTPS MITM via a locally-trusted certificate authority.

## Decision

1. **Rebuild from scratch as a local HTTP(S) intercepting proxy**, not a browser extension.
2. **Implement it in Go.** A Go proxy compiles to a single self-contained binary per OS (trivial
   distribution for an open-source tool), has strong standard-library HTTP support, mature MITM
   libraries, and good concurrency for proxy workloads.
3. **Archive the old extension** read-only under `legacy/abandoned/` instead of deleting it, so its
   tested logic and decisions remain available as reference.

## Consequences

**Accepted trade-offs:**

- The TypeScript `rule-engine` / `shared-types` packages are **not reused**. Their logic will be
  re-implemented in Go. This is a deliberate cost of changing language; the old code stays as a
  reference in `legacy/`.
- A proxy is more complex than an extension in specific areas: a generated CA certificate must be
  installed/trusted by the user, TLS/HTTP2 handling, and per-OS packaging. These are real work
  items, scheduled explicitly in the backlog rather than assumed.
- Users must configure their client/system to use the proxy (or install the CA for HTTPS). This is
  the same model as Charles/Burp/mitmproxy and is accepted.

**What we keep from the old project:**

- The product vision (QA-focused interception) and the hard-won process lessons:
  **one source of truth, one backlog, and "Done" means verified at runtime** — see `AGENTS.md`.

## Out of scope (recorded so it is not re-litigated)

Reverse proxy / load balancing, DNS spoofing, port forwarding, and offensive-security tooling
(scanner / intruder / fuzzer) are **not** goals of this project. The focus is inspection,
modification, mocking, and replay for QA and development.
