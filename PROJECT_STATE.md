# PROJECT_STATE — QA.Interceptor Platform

> **Single source of truth for the real state of the project.** Update this whenever you finish
> a task or change the architecture. Keep it honest: only list something as working if it was
> verified running (see the golden rule in `AGENTS.md`).

**Last updated:** 2026-10-02

---

## 1. What this project is

A local-first HTTP(S) intercepting proxy for QA and developers, written in **Go**. A lightweight
open-source alternative to Burp / Charles / Requestly / HTTP Toolkit. Everything runs locally.

Decision record: [`docs/adr/0001-why-proxy-and-go.md`](docs/adr/0001-why-proxy-and-go.md).

## 2. Current state (honest)

**Phase 0 in progress — the walking skeleton proxy works.**

- ✅ Old extension archived read-only in `legacy/abandoned/`.
- ✅ Repository foundation: `go.mod`, `.gitignore`, compass docs (`AGENTS.md`, `CLAUDE.md`,
  `KIRO.md`), steering (`.kiro/steering/project.md`), ADR-0001, this file, `BACKLOG.md`.
- ✅ Go 1.27 toolchain confirmed installed (`C:\Program Files\Go\bin\go.exe`).
- ✅ **P0-01 DONE (verified running):** forward HTTP proxy in `internal/proxy/proxy.go` +
  entry point `cmd/proxy/main.go`. A real request to `http://example.com` through
  `go run ./cmd/proxy` returned 200 and was logged. Tests green (`internal/proxy/proxy_test.go`).
- ✅ **P0-03 DONE:** `--port` flag + graceful SIGINT/SIGTERM shutdown in `main.go`.
- ✅ **P0-02 DONE (verified running):** `internal/capture.Store` — thread-safe, bounded
  in-memory store implementing `proxy.Observer`. 3 real requests captured through the running
  proxy (incl. an error exchange). Tests green incl. a 5000-write concurrency test.
- ✅ **Phase 0 complete.** The walking skeleton proxy captures traffic end to end.
- ✅ **P1-01 DONE (verified):** local ECDSA root CA in `internal/mitm` (`LoadOrCreateCA`),
  persisted to `.certs/` (gitignored, key 0600), reused on restart.
- ✅ **P1-02 DONE (verified running):** TLS MITM on CONNECT. `curl --cacert .certs/ca-cert.pem`
  loaded `https://example.com` through the proxy (HTTP 200) and it was captured as
  `GET https://example.com:443/ -> 200`. Per-host leaf signing with SNI + CONNECT-host fallback.
- ✅ **P1-03 DONE (verified):** pass-through tunneling. With `--no-mitm-hosts example.com`,
  `example.com` loaded without decryption (not captured) while `example.org` was still MITM'd.
- ✅ **P1-04 DONE (verified):** `--export-ca <path>` exports the CA cert; README documents trust
  steps for Windows/macOS/Linux/Firefox.
- ✅ **Phase 1 complete.** HTTP + HTTPS interception, pass-through, and CA trust all work.
- ✅ **P2-01 DONE (verified running):** `internal/ui` serves a live localhost web UI
  (`--ui-port`, default 9090) listing captured requests via a polled JSON API.
- ✅ **P2-02 DONE (verified running):** request/response headers + bodies captured (bounded 256 KB)
  and shown in a detail drawer via `GET /api/requests/{id}`. Verified with a real HTTPS POST.
- ✅ **P2-03 DONE (verified running):** `POST /api/clear` (204) empties the store; page has a Clear
  button + substring search box. Verified: 2 captures → clear → `/api/requests` returned `[]`.
- ✅ **Phase 2 complete.** Live inspection UI: list, detail (headers+bodies), clear, filter.
- ✅ **P3-01 DONE (unit-tested):** `internal/rules` — pure rule model + matcher.
- ✅ **P3-02 DONE (verified running):** block rule. `--rules <file.json>` loads rules;
  `Proxy.WithRules` + `applyShortCircuit` in `serveRelayed` short-circuit a block with 403.
- ✅ **P3-03 DONE (verified running):** redirect rule. `applyShortCircuit` also handles redirect →
  302 with `Location`. Verified: `neverssl.com → 302 → example.com`, `example.org → 403` coexist.
- ⬜ **P3-04 (header rewrite) — next**, then P3-05 (mock), P3-06 (body rewrite).

> **Known limitation:** Windows `curl` (schannel) needs `--ssl-no-revoke` because our leaf has no
> CRL/OCSP endpoint; browsers with the CA installed are fine. Documented in README; optional
> refinement later.

### What exists in code

- `internal/proxy/proxy.go` — `Proxy` (an `http.Handler`), `ListenAndServe`, the **`Observer`
  seam** (each `Exchange` = method, URL, status, duration, err), `StdoutLogger()`,
  `MultiObserver(...)`. CONNECT is MITM-intercepted via `WithMITM(certProvider)`; hosts rejected
  by `WithTunnelDecider(...)` are spliced raw by `rawTunnel`. The decrypted path reuses the plain
  relay (`serveRelayed`) — no duplication.
- `internal/capture/capture.go` — `Store` implementing `proxy.Observer`: thread-safe, bounded,
  monotonic IDs, `List()`/`Len()`/`Clear()`. This is what the Phase 2 UI will read.
- `internal/mitm/ca.go` — root CA generate/load/persist (`LoadOrCreateCA`, `CA.CertPEM`).
- `internal/mitm/leaf.go` — `LeafCache`: per-host leaf signing + `TLSConfigForHost(fallback)`.
- `internal/proxy/connwriter.go` — `connResponseWriter` so the MITM path reuses the same relay
  code as plain HTTP (writes a response back over the raw TLS conn).
- `internal/ui/ui.go` + `internal/ui/static/index.html` — the inspection UI: a `RecordSource`
  interface (`List()` + `Get(id)` + `Clear()`, satisfied by `*capture.Store`), JSON endpoints
  `/api/requests` (list), `/api/requests/{id}` (detail), `POST /api/clear`, and an embedded page
  that polls the list, filters client-side, opens a detail drawer, and clears.
- `internal/rules/rules.go` — pure rule model + matcher (`Rule`, `Condition`, `ActionType`,
  `Set.Match`/`FirstMatch`). No net/http coupling; the proxy adapts its request into `rules.Request`.
- `cmd/proxy/main.go` — wires the CA + leaf cache + `MultiObserver(StdoutLogger, store)` + the UI
  server, flags `--port`, `--ui-port`, `--cert-dir`, `--export-ca`, `--no-mitm-hosts`, graceful
  shutdown of both servers.
- Tests: `internal/proxy/proxy_test.go`, `internal/proxy/mitm_test.go`,
  `internal/capture/capture_test.go`, `internal/mitm/ca_test.go`, `internal/ui/ui_test.go`.

## 3. Architecture (target)

A single Go binary that runs a local proxy. Clients (browser, mobile, CLI) point at it. Captured
traffic is held in an in-memory store and surfaced to a UI. Rules/mocks modify traffic in flight.

```
cmd/proxy/            the proxy binary entry point
internal/
  proxy/              HTTP(S) interception core (listener, forwarding, MITM later)
  capture/            captured request/response store + domain types
  rules/              (later) rule matching + actions, ported conceptually from legacy
  mock/               (later) mock/stub responses
  ui/                 (later) local web UI server for inspection
docs/adr/             architecture decision records
legacy/abandoned/     old TS extension (READ ONLY)
```

Import direction stays one-way; `internal/capture` has no dependency on `internal/proxy`.

## 4. Build & verify

```bash
go build ./...
go test ./...
go vet ./...
gofmt -l .          # prints nothing when all files are formatted
go run ./cmd/proxy  # once P0-01 lands
```

## 5. What exists from the old project (reference only)

`legacy/abandoned/` contains the full TypeScript extension: a tested pure-logic rule engine,
shared types, the plain-TS side panel UI, and extensive (over-grown) documentation. **Do not
import or edit it.** Use it only to understand prior logic when porting a feature to Go.

## 6. Next step for the AI (read this if you are a new session)

**Task: start Phase 3 — modify & mock. This is the core QA value.** Phases 0–2 are complete: the
proxy captures HTTP+HTTPS and the UI shows list + detail + clear/filter. Now make the proxy
*change* traffic. Build it in small, independently-verifiable slices, in this order.

Current relevant state:

- Every request flows through `proxy.serveRelayed` (plain HTTP and decrypted HTTPS share it). This
  is where rule actions hook in — before relaying (block/redirect/mock/request-rewrite) and after
  the response returns (header/response-body rewrite).
- `proxy.Exchange` already carries method/URL/headers/bodies, so matching has everything it needs.
- The legacy TS rule engine lives in `legacy/abandoned/packages/rule-engine` — **conceptual
  reference only; re-implement in Go, do not import it.**

P3-01 (model/matcher) and P3-02 (block) are DONE. The wiring pattern is now established and the
remaining actions follow it. **Study `serveRelayed` + `applyBlock` in `internal/proxy/proxy.go`
first — the new actions hook into the same `serveRelayed` method.**

Established pattern:
- `Proxy` holds a `RuleEngine` (set via `WithRules`, nil = no rules). `main.go` loads rules from
  `--rules <file.json>` via `loadRules` → `rules.NewSet`.
- `serveRelayed` is the single hook for BOTH plain HTTP and decrypted HTTPS. `applyBlock` runs
  there before `relay` and short-circuits with 403 on a block match.
- `example-rules.json` at the repo root is a working sample (currently a block rule).

P3-02 (block) and P3-03 (redirect) are DONE — both short-circuit via `applyShortCircuit`
(add `ActionMockResponse` there for P3-05, same shape). The remaining actions modify a REAL relay
(they don't short-circuit), so they need a different hook and ALL matching rules, not just the
first.

Remaining slices (one at a time, each runtime-verified + unit-tested):

1. **P3-04 — header rewrite.** `rule.Headers []HeaderOp` (`Name`, `Value`, `Remove`, `OnResp`).
   This matches AND relays, so you need all matching rewrite-header rules — **extend the
   `RuleEngine` interface with `Match(req) []rules.Rule`** (`*rules.Set` already has it). In
   `serveRelayed`: apply request-header ops (`OnResp==false`) to `r.Header` BEFORE `relay`; apply
   response-header ops (`OnResp==true`) to `resp.Header`/`w.Header()` AFTER relay, before writing.
   **Verify:** the capture detail (`/api/requests/{id}`) shows the added header / missing removed
   header. Add a unit test asserting header mutation on both sides.
2. **P3-05 — mock response.** Short-circuit (add `ActionMockResponse` to `applyShortCircuit`'s
   `FirstMatch` + a case): write `rule.MockStatus` + `rule.MockBody`, skip origin. **Verify:**
   mocked body returned, origin not hit.
3. **P3-06 — response-body rewrite.** After reading the response body in `serveRelayed`, if a
   matching `ActionRewriteResponseBody` rule exists, `strings.ReplaceAll(body, rule.BodySearch,
   rule.BodyReplace)` before writing to the client AND before capturing. **Verify:** client
   receives the modified body; capture shows the modified body.

After P3-06, Phase 3 is complete and the tool does real QA modification. Then Phase 4 (replay,
persistence, polish). A C compiler is NOT installed, so `go test -race` cannot run here.

Validate every slice with: `go build ./...` · `go test ./...` · `go vet ./...` · `gofmt -l .` ·
then run it and confirm the behavior. Update this file + `BACKLOG.md` with evidence; commit.

Validate every slice with: `go build ./...` · `go test ./...` · `go vet ./...` · `gofmt -l .` ·
then run it and confirm the behavior in a browser. Update this file + `BACKLOG.md` with evidence;
commit.

## 7. How to run what exists today

```bash
go run ./cmd/proxy --port 8080 --ui-port 9090
# Proxy on 127.0.0.1:8080, inspection UI on http://127.0.0.1:9090.
# Point an HTTP client at the proxy:
#   curl -x http://127.0.0.1:8080 http://example.com
# For HTTPS, trust the CA (see README) then:
#   curl -x http://127.0.0.1:8080 --cacert .certs/ca-cert.pem https://example.org
#   (Windows curl.exe also needs --ssl-no-revoke)
# Ctrl-C stops both servers cleanly.
```
