# ADR-006: Phase 4 Proxy Engine Architecture
<!-- markdownlint-disable MD040 -->

**Status**: Proposed  
**Date**: 2026-06-12  
**Author**: Architect Agent

---

## Context

The browser extension (Phases 1-3) only intercepts traffic originating from browser tabs. QA professionals also need to intercept:

- Native mobile app traffic (Android/iOS)
- Desktop application traffic (Electron apps, Java, .NET, Python)
- Non-browser HTTP clients (curl, Postman, axios from Node.js)
- System-level network traffic

This requires a **local HTTP/HTTPS proxy server** that the operating system (or device) routes traffic through. The proxy applies the same rule engine already in `packages/rule-engine` — no business logic duplication.

---

## Architecture Decision

### 1. New Package: `@qa-interceptor/proxy`

A standalone Node.js package at `packages/proxy/`:

```
packages/proxy/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts            ← Public API: createProxyServer()
    ├── http-proxy.ts       ← HTTP/1.1 forward proxy (no HTTPS)
    ├── connect-handler.ts  ← HTTP CONNECT tunneling for HTTPS
    ├── tls-ca.ts           ← Self-signed CA + per-domain cert issuance
    ├── rule-bridge.ts      ← Adapter: applies @qa-interceptor/rule-engine to proxied requests
    ├── traffic-capture.ts  ← Emits captured requests/responses (same StoredCapturedRequest shape)
    └── system-proxy.ts     ← OS-level proxy registration (Windows/macOS/Linux)
```

**Invariants for this package**:

- `rule-bridge.ts` is the only file that imports from `@qa-interceptor/rule-engine`.
- `traffic-capture.ts` emits events using Node.js `EventEmitter` — consumers decide where to store them.
- No UI code. No browser extension APIs.

---

### 2. HTTP Forward Proxy (Port 8080 default)

```
Client (browser/device/app)
        │ HTTP GET http://api.example.com/users
        ▼
┌──────────────────┐
│  http-proxy.ts   │  ← Receives plain HTTP requests
│  Node.js http.Server
│  Port 8080        │
└───────┬──────────┘
        │ apply rule-bridge.ts
        │ → evaluateRules(rules, interceptedRequest)
        │ → applyTransformations(matchedRules, request)
        │ → capture(request)
        ▼
┌──────────────────┐
│  Remote Server   │
│  api.example.com │
└───────┬──────────┘
        │ response
        ▼
┌──────────────────┐
│  capture(res)    │ ← emit 'response' event
│  apply response  │ ← response body/header rewrite rules
│  transformations │
└───────┬──────────┘
        │
        ▼
     Client
```

---

### 3. HTTPS Interception (CONNECT method)

The proxy uses a **man-in-the-middle CA** approach — industry standard for local dev tools (Charles, Fiddler, mitmproxy).

```
Client
  │  CONNECT api.example.com:443 HTTP/1.1
  ▼
┌──────────────────────────────────┐
│  connect-handler.ts              │
│  1. Accept CONNECT tunnel        │
│  2. Generate cert for domain     │  ← tls-ca.ts
│  3. Present cert to client       │
│  4. Decrypt client TLS           │
│  5. Re-encrypt outbound TLS      │
│  6. Apply rule pipeline          │
│  7. capture + transform          │
└──────────────────────────────────┘
```

**Certificate Authority design** (in `tls-ca.ts`):

- Generate root CA on first proxy start, persist to `~/.qa-interceptor/ca/`.
- Issue per-domain leaf certificates signed by root CA.
- Cache issued certs in memory (Map<string, tls.SecureContext>) — no disk write per request.
- Expose `getCertPath()` so users can import into OS trust store.

**Recommended library**: Node.js built-in `tls`, `crypto`. Consider `node-forge` only if SubjectAltName generation proves complex with built-ins.

---

### 4. Rule Integration via `rule-bridge.ts`

The proxy must apply the same rules as the browser extension. The bridge adapts the proxy's request shape to `InterceptedRequest` (from `@qa-interceptor/shared-types`):

```typescript
// rule-bridge.ts
import { evaluateRules } from "@qa-interceptor/rule-engine";
import type { InterceptedRequest } from "@qa-interceptor/shared-types";

export const applyRules = (
  rules: Rule[],
  proxyRequest: IncomingMessage,
  url: URL
): { matchedRules: MatchedRule[]; modifiedRequest: TransformedRequest } => { ... }
```

This ensures **the same rule evaluation semantics** in the browser extension, desktop proxy, and any future surface.

---

### 5. System Proxy Registration (`system-proxy.ts`)

| OS          | Mechanism                                                                 |
| ----------- | ------------------------------------------------------------------------- |
| **Windows** | `netsh winhttp set proxy 127.0.0.1:8080` + Internet Options registry keys |
| **macOS**   | `networksetup -setwebproxy Wi-Fi 127.0.0.1 8080`                          |
| **Linux**   | Set `http_proxy` / `https_proxy` env vars + `gsettings` for GNOME         |

- Registration is **opt-in** — the proxy starts without modifying OS settings unless the user clicks "Activate system proxy".
- Registration is **reversible** — cleanup on process exit / user toggle.
- Each platform adapter lives in `system-proxy.ts` behind a `process.platform` switch.

---

### 6. Desktop App Shell (`packages/desktop/`)

The proxy is embedded inside an Electron application:

```
packages/desktop/
├── package.json
├── main.ts           ← Electron main process: launches proxy, loads UI
├── preload.ts        ← Secure bridge (contextBridge) to renderer
└── src/
    └── ipc-handlers.ts  ← IPC channels: proxy-start, proxy-stop, get-traffic, etc.
```

**IPC channel contract** (discriminated union, same pattern as ADR-003):

- `proxy:start { port: number }` → `{ ok: true }` | `{ ok: false; error: string }`
- `proxy:stop` → `{ ok: true }`
- `proxy:get-traffic` → `StoredCapturedRequest[]`
- `proxy:apply-rules` → used by renderer to push updated rules to proxy
- `proxy:get-ca-path` → `string` (path to CA cert file)

**UI reuse strategy**: The React/HTML sidepanel components are loaded in the Electron renderer window. The same feature modules (rules, network, mocks, history, settings) work unchanged because they communicate via the storage abstraction layer — only `storage/index.ts` needs a Desktop adapter that reads from the Electron main process instead of `chrome.storage`.

---

### 7. Storage Adapter Pattern for Desktop

The `storage/index.ts` today calls `chrome.storage.local`. For desktop, introduce a **storage adapter interface**:

```typescript
// storage/adapter.ts
export interface StorageAdapter {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}
```

- Extension uses `ChromeStorageAdapter` (wraps `chrome.storage.local`).
- Desktop uses `ElectronStorageAdapter` (wraps `ipcRenderer.invoke("storage:get/set")`).
- The feature modules are unmodified — they call the same `loadRules()`, `saveRules()` functions.

---

## Phased Delivery Plan

| Phase   | Deliverable                                       | Weeks |
| ------- | ------------------------------------------------- | ----- |
| **4.0** | HTTP proxy skeleton, rule-bridge, traffic capture | 1-2   |
| **4.1** | HTTPS interception (CONNECT + CA)                 | 2-3   |
| **4.2** | System proxy registration (OS auto-config)        | 1     |
| **4.3** | Device pairing UI (Android/iOS Wi-Fi routing)     | 1     |
| **4.4** | Electron desktop shell + IPC                      | 2-3   |
| **4.5** | Storage adapter + UI reuse in desktop             | 1-2   |

**Total estimated effort**: 8-12 weeks (1 Architect + 1 Developer)

---

## Technology Choices

| Need              | Choice                                   | Rationale                     |
| ----------------- | ---------------------------------------- | ----------------------------- |
| HTTP server       | `node:http` (built-in)                   | Zero deps, full control       |
| TLS/certs         | `node:tls` + `node:crypto`               | Built-in, sufficient for CA   |
| CONNECT tunneling | `net.Socket.pipe()`                      | Standard tunnel approach      |
| Electron          | Latest stable                            | Established, React-compatible |
| IPC               | `ipcMain/ipcRenderer` with contextBridge | Secure by default             |

---

## Risks

| Risk                                   | Mitigation                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| HTTPS cert import UX friction          | Provide one-click install script per OS; show QR code for mobile                |
| Certificate pinning breaks mobile apps | Document limitation; advise disabling for test builds                           |
| OS proxy registration requires admin   | Prompt for elevation; provide manual instructions as fallback                   |
| Electron bundle size (~100MB)          | Use `electron-builder` with asar compression; exclude dev deps                  |
| Rule engine perf at high throughput    | Benchmark `evaluateRules` at 1,000 req/s; optimize condition matching if needed |

---

## Consequences

**Positive**:

- Full interception for any HTTP/HTTPS client — mobile, desktop, CLI, browsers.
- Zero rule logic duplication — proxy reuses `@qa-interceptor/rule-engine` exactly.
- UI reuse — 80%+ of sidepanel feature modules work in desktop without changes.
- Clear extension points — storage adapter and IPC channels are designed for future cloud sync (Phase 5).

**Negative / Trade-offs**:

- Introduces Node.js runtime dependency (Electron bundles it).
- OS-level proxy registration is platform-specific and requires privilege escalation.
- HTTPS interception requires user trust store installation — adds UX friction for first-time setup.
- Electron bundle size (~100-150MB) is large compared to the browser extension (~500KB).
