# QA.Interceptor Platform

An open-source, local-first HTTP(S) interception toolkit for QA and developers — a lightweight
alternative to Burp Suite, Charles Proxy, Requestly, and HTTP Toolkit.

It runs as a **local proxy** on your machine. You point a browser, mobile device, or any HTTP
client at it, and you can inspect, modify, mock, and replay traffic — including HTTPS, via a
locally-generated certificate authority that never leaves your machine.

> **Status:** early rewrite. The project was previously a Manifest V3 browser extension
> (TypeScript). It is being rebuilt from scratch in **Go** as a local proxy to escape the
> platform limits of a browser extension (no WebSocket frames, no non-browser traffic, no real
> HTTPS MITM). The old code is archived read-only in [`legacy/abandoned/`](legacy/abandoned/).

## Why a proxy instead of a browser extension

A browser extension can only see and modify traffic the browser itself makes, and MV3 blocks
whole categories of interception (WebSocket frames, real response-body rewriting, anything
outside the browser). A local proxy sits below all of that: it can intercept any HTTP client on
the machine or network. See [`docs/adr/0001-why-proxy-and-go.md`](docs/adr/0001-why-proxy-and-go.md)
for the full decision.

## Project layout

```
cmd/            entry points (the proxy binary, future CLI/desktop)
internal/       application code, not importable by other modules
  proxy/        the HTTP(S) interception core
  capture/      captured-traffic store + types
  ...           (rules, mocks, UI server — added phase by phase)
docs/adr/       architecture decision records (the "why")
legacy/         the archived TypeScript extension (read-only history)
```

## Build & run

Requires **Go 1.27+**.

```bash
go build ./...        # compile everything
go test ./...         # run all tests
go run ./cmd/proxy    # start the proxy on 127.0.0.1:8080
```

Flags:

- `--port <n>` — listen port (default 8080)
- `--cert-dir <dir>` — where the local CA lives (default `.certs`)
- `--export-ca <path>` — write the CA certificate to a file and exit
- `--no-mitm-hosts a.com,b.com` — tunnel these hosts without decryption (for
  certificate-pinned apps that break under interception)

Point your browser or system HTTP/HTTPS proxy at `127.0.0.1:8080`, then browse.
Plain HTTP is captured immediately.

## Intercepting HTTPS (trust the local CA)

HTTPS interception needs your client to trust the proxy's locally-generated
certificate authority. The CA private key never leaves your machine and is never
committed (it lives under `.certs/`, which is git-ignored).

1. Start the proxy once so the CA is generated, or export it directly:
   ```bash
   go run ./cmd/proxy --export-ca qa-interceptor-ca.pem
   ```
2. Trust `qa-interceptor-ca.pem` (= `.certs/ca-cert.pem`):
   - **Windows:** `certutil -addstore -user Root qa-interceptor-ca.pem` (or import
     it into *Trusted Root Certification Authorities* via `certmgr.msc`).
   - **macOS:** add it to the login keychain and set it to *Always Trust*.
   - **Linux:** copy to `/usr/local/share/ca-certificates/` and run
     `update-ca-certificates`.
   - **Firefox:** import under Settings → Privacy & Security → Certificates →
     *View Certificates* → Authorities (Firefox uses its own store).
3. Browse `https://` sites through the proxy; they are now decrypted and captured.

> **Note (Windows native clients):** some Windows TLS stacks (schannel, used by
> `curl.exe`) refuse the leaf cert with "revocation status unknown" because the
> locally-signed cert has no CRL/OCSP endpoint. Browsers with the CA trusted work
> fine; for `curl.exe` pass `--ssl-no-revoke`. Removing this wrinkle entirely is a
> tracked refinement (see `BACKLOG.md`, P1-04 note).

## Working on this project (humans and AI)

Read these before touching code — they are the single source of truth:

1. [`PROJECT_STATE.md`](PROJECT_STATE.md) — what actually exists right now.
2. [`BACKLOG.md`](BACKLOG.md) — the one official backlog; pick the next task here.
3. [`AGENTS.md`](AGENTS.md) — the onboarding contract for any AI/human.

**Golden rule:** a task is only "Done" when it is verified running — not when it merely builds.

## License

See [`license`](license).
