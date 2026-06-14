/**
 * Pure utility functions used across sidepanel feature modules.
 * No DOM access, no chrome API calls.
 */

import type {
  RequestRow,
  HistorySession,
  ResponseAssertionRow,
  EvidenceReport,
  EvidenceAssertionEntry,
  EvidenceTrafficEntry
} from "./types";

// ---------------------------------------------------------------------------
// String / DOM helpers
// ---------------------------------------------------------------------------

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleTimeString();
};

export const formatDuration = (durationMs: number): string => `${durationMs} ms`;

export const formatDateSlug = (): string => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
};

export const formatRuleType = (type: string): string => RULE_TYPE_CATALOG[type]?.label ?? type;

/**
 * Single source of rule-type presentation (D-10): short label + runtime action
 * summary. Add new rule types here only.
 */
export const RULE_TYPE_CATALOG: Record<string, { label: string; action: string }> = {
  "rewrite-url": {
    label: "Rewrite URL",
    action: "Action: URL rewritten before request dispatch."
  },
  "rewrite-header": {
    label: "Rewrite Header",
    action: "Action: request headers adjusted by rewrite operations."
  },
  "rewrite-query": {
    label: "Rewrite Query",
    action: "Action: query string modified by rule operations."
  },
  "rewrite-response": {
    label: "Rewrite Response",
    action: "Action: synthetic response body returned for matched request."
  },
  "rewrite-request-body": {
    label: "Rewrite Request Body",
    action: "Action: request body transformed before fetch execution."
  },
  "mock-response": {
    label: "Mock Response",
    action: "Action: mocked response payload served to caller."
  },
  "mock-status": {
    label: "Mock Status",
    action: "Action: mocked HTTP status code applied."
  },
  block: { label: "Block", action: "Action: request blocked by interception rule." },
  delay: { label: "Delay", action: "Action: request delayed to simulate network latency." },
  redirect: {
    label: "Redirect",
    action: "Action: request redirected to configured destination."
  }
};

export const summarizeRuleAction = (type: string): string =>
  RULE_TYPE_CATALOG[type]?.action ?? "Action: rule matched and applied in runtime pipeline.";

export const formatRuleCondition = (condition: {
  method?: string;
  urlContains?: string;
}): string => {
  if (condition.method && condition.urlContains) {
    return `Method: ${condition.method} • URL contains: ${condition.urlContains}`;
  }

  if (condition.method) {
    return `Method: ${condition.method}`;
  }

  if (condition.urlContains) {
    return `URL contains: ${condition.urlContains}`;
  }

  return "Always on";
};

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

export type StatusTone = "ok" | "redirect" | "client" | "server" | "pending";

export const getStatusToneClass = (status: number | undefined): StatusTone => {
  if (typeof status !== "number") {
    return "pending";
  }

  if (status >= 200 && status < 300) {
    return "ok";
  }

  if (status >= 300 && status < 400) {
    return "redirect";
  }

  if (status >= 400 && status < 500) {
    return "client";
  }

  return "server";
};

export const getTimelineWidthPercent = (durationMs: number | undefined): number => {
  if (!durationMs || durationMs <= 0) {
    return 0;
  }

  return Math.max(4, Math.min(100, Math.round((durationMs / 2000) * 100)));
};

// ---------------------------------------------------------------------------
// Matched rule chips
// ---------------------------------------------------------------------------

export const renderRuleChips = (
  matchedRules: Array<{ ruleId: string; ruleName: string; type: string }>
): string => {
  if (matchedRules.length === 0) {
    return '<span class="rule-chip muted">No rules matched</span>';
  }

  return matchedRules
    .map((rule) => `<span class="rule-chip">${escapeHtml(rule.ruleName)}</span>`)
    .join("");
};

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export const triggerDownload = (filename: string, content: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

export const generateId = (prefix: string): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

// ---------------------------------------------------------------------------
// History evidence helpers
// ---------------------------------------------------------------------------

export const buildHistorySessions = (rows: RequestRow[]): HistorySession[] => {
  if (rows.length === 0) {
    return [];
  }

  const buckets = new Map<string, RequestRow[]>();

  for (const row of rows) {
    const date = new Date(row.timestamp);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const bucketStart = Math.floor(date.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000);
    const bucketId = String(bucketStart);
    const current = buckets.get(bucketId) ?? [];
    current.push(row);
    buckets.set(bucketId, current);
  }

  return Array.from(buckets.entries())
    .map(([bucketId, bucketRows]) => {
      const sortedRows = bucketRows
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const startedAt = sortedRows[0]?.timestamp ?? new Date(Number(bucketId)).toISOString();
      const endedAt = sortedRows[sortedRows.length - 1]?.timestamp ?? startedAt;
      const failedCount = sortedRows.filter((row) => {
        const status = row.response?.status;
        return typeof status === "number" && status >= 400;
      }).length;
      const pendingCount = sortedRows.filter((row) => !row.response).length;

      return {
        id: `session-${bucketId}`,
        label: `Session ${formatTimestamp(startedAt)}`,
        startedAt,
        endedAt,
        requests: sortedRows,
        failedCount,
        pendingCount
      };
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
};

export const computeAverageDuration = (rows: RequestRow[]): number => {
  const durations = rows
    .map((row) => row.response?.durationMs)
    .filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0
    );

  if (durations.length === 0) {
    return 0;
  }

  const total = durations.reduce((sum, value) => sum + value, 0);
  return Math.round(total / durations.length);
};

export const getUniqueMatchedRulesCount = (rows: RequestRow[]): number => {
  const ids = new Set<string>();

  for (const row of rows) {
    for (const matched of row.matchedRules) {
      ids.add(matched.ruleId);
    }
  }

  return ids.size;
};

// ---------------------------------------------------------------------------
// Evidence builders (QP-004, QP-005)
// ---------------------------------------------------------------------------

const buildEvidenceTraffic = (session: HistorySession): EvidenceTrafficEntry[] =>
  session.requests
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((row) => ({
      id: row.id,
      method: row.method,
      url: row.url,
      timestamp: row.timestamp,
      matchedRules: row.matchedRules,
      ...(row.response
        ? {
            response: {
              status: row.response.status,
              durationMs: row.response.durationMs,
              ...(row.response.headers ? { headers: row.response.headers } : {}),
              ...(row.response.body ? { body: row.response.body } : {})
            }
          }
        : {})
    }));

const buildAssertionEntries = (assertions: ResponseAssertionRow[]): EvidenceAssertionEntry[] =>
  assertions.map((a) => ({
    id: a.id,
    type: a.type,
    enabled: a.enabled,
    expected: a.expected,
    ...(a.path !== undefined ? { path: a.path } : {}),
    ...(a.actual !== undefined ? { actual: a.actual } : {}),
    ...(a.error !== undefined ? { error: a.error } : {}),
    passed: a.error === undefined && a.actual !== undefined ? a.actual === a.expected : undefined
  }));

export const buildEvidenceJson = (
  session: HistorySession,
  assertions: ResponseAssertionRow[]
): EvidenceReport => {
  const assertionEntries = buildAssertionEntries(assertions);
  const assertionsEnabled = assertionEntries.filter((a) => a.enabled);
  const assertionsPassed = assertionsEnabled.filter((a) => a.passed === true).length;
  const assertionsFailed = assertionsEnabled.filter((a) => a.passed === false).length;

  return {
    id: `evidence-${Date.now()}`,
    label: session.label,
    generatedAt: new Date().toISOString(),
    period: { startedAt: session.startedAt, endedAt: session.endedAt },
    summary: {
      totalRequests: session.requests.length,
      failedRequests: session.failedCount,
      pendingRequests: session.pendingCount,
      averageDurationMs: computeAverageDuration(session.requests),
      assertionsPassed,
      assertionsFailed,
      assertionsTotal: assertionsEnabled.length,
      uniqueRulesTriggered: getUniqueMatchedRulesCount(session.requests)
    },
    assertions: assertionEntries,
    traffic: buildEvidenceTraffic(session)
  };
};

export const buildEvidenceMarkdown = (
  session: HistorySession,
  assertions: ResponseAssertionRow[] = []
): string => {
  const assertionEntries = buildAssertionEntries(assertions.filter((a) => a.enabled));
  const assertionsPassed = assertionEntries.filter((a) => a.passed === true).length;
  const assertionsFailed = assertionEntries.filter((a) => a.passed === false).length;

  const lines: string[] = [
    `# QA Evidence — ${session.label}`,
    ``,
    `**Period:** ${formatTimestamp(session.startedAt)} → ${formatTimestamp(session.endedAt)}`,
    `**Requests:** ${session.requests.length}  |  **Failures:** ${session.failedCount}  |  **Pending:** ${session.pendingCount}`,
    ``
  ];

  if (assertionEntries.length > 0) {
    lines.push(`## Assertions`);
    lines.push(``);
    lines.push(`| # | Type | Expected | Path | Result |`);
    lines.push(`|---|------|----------|------|--------|`);

    assertionEntries.forEach((assertion, i) => {
      const result =
        assertion.passed === true ? "✅ Pass" : assertion.passed === false ? "❌ Fail" : "⏳ N/A";
      const path = assertion.path ?? "-";
      const expected = String(assertion.expected ?? "");
      lines.push(`| ${i + 1} | ${assertion.type} | ${expected} | ${path} | ${result} |`);
    });

    lines.push(``);
    lines.push(
      `**Assertions:** ${assertionEntries.length} total  |  ✅ ${assertionsPassed} passed  |  ❌ ${assertionsFailed} failed`
    );
    lines.push(``);
  }

  lines.push(`## Traffic Timeline`);
  lines.push(``);

  const sorted = session.requests
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const row of sorted) {
    const status = row.response ? String(row.response.status) : "Pending";
    const duration = row.response ? formatDuration(row.response.durationMs) : "-";
    const rules = row.matchedRules.map((r) => r.ruleName).join(", ") || "none";
    lines.push(`### ${row.method} ${row.url}`);
    lines.push(`- **Timestamp:** ${formatTimestamp(row.timestamp)}`);
    lines.push(`- **Status:** ${status}  |  **Duration:** ${duration}`);
    lines.push(`- **Matched rules:** ${rules}`);

    if (row.response?.body) {
      lines.push(`- **Response body:**`);
      lines.push(`\`\`\`json`);
      lines.push(row.response.body);
      lines.push(`\`\`\``);
    }

    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Generated by QA.Interceptor on ${new Date().toISOString()}*`);

  return lines.join("\n");
};

// ---------------------------------------------------------------------------
// HTML evidence report (QP-006) — self-contained, printable, no external deps
// ---------------------------------------------------------------------------

const statusToneFor = (status: number | undefined): "ok" | "warn" | "err" | "muted" => {
  if (status === undefined) return "muted";
  if (status >= 500) return "err";
  if (status >= 400) return "warn";
  if (status >= 200 && status < 300) return "ok";
  return "muted";
};

const evidenceBar = (label: string, count: number, total: number, tone: string): string => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    `<div class="bar-row"><span class="bar-label">${escapeHtml(label)}</span>` +
    `<span class="bar-track"><span class="bar-fill ${tone}" style="width:${String(pct)}%"></span></span>` +
    `<span class="bar-value">${String(count)} (${String(pct)}%)</span></div>`
  );
};

export const buildEvidenceHtml = (
  session: HistorySession,
  assertions: ResponseAssertionRow[] = []
): string => {
  const report = buildEvidenceJson(session, assertions);
  const s = report.summary;

  const statusBuckets = { ok: 0, warn: 0, err: 0, pending: 0 };
  for (const t of report.traffic) {
    const status = t.response?.status;
    if (status === undefined) statusBuckets.pending++;
    else if (status >= 500) statusBuckets.err++;
    else if (status >= 400) statusBuckets.warn++;
    else if (status >= 200 && status < 300) statusBuckets.ok++;
  }
  const totalTraffic = report.traffic.length;
  const maxDuration = Math.max(1, ...report.traffic.map((t) => t.response?.durationMs ?? 0));

  const assertionRows = report.assertions
    .filter((a) => a.enabled)
    .map((a, i) => {
      const tone = a.passed === true ? "ok" : a.passed === false ? "err" : "muted";
      const result = a.passed === true ? "Pass" : a.passed === false ? "Fail" : "N/A";
      return (
        `<tr><td>${String(i + 1)}</td><td>${escapeHtml(a.type)}</td>` +
        `<td>${escapeHtml(String(a.expected ?? ""))}</td>` +
        `<td>${escapeHtml(a.path ?? "-")}</td>` +
        `<td>${escapeHtml(a.actual !== undefined ? String(a.actual) : "-")}</td>` +
        `<td><span class="pill ${tone}">${result}</span></td></tr>`
      );
    })
    .join("");

  const trafficRows = report.traffic
    .map((t) => {
      const status = t.response?.status;
      const durationMs = t.response?.durationMs ?? 0;
      const tone = statusToneFor(status);
      const statusText = status === undefined ? "Pending" : String(status);
      const durPct = Math.round((durationMs / maxDuration) * 100);
      const rules =
        t.matchedRules.length > 0 ? t.matchedRules.map((r) => r.ruleName).join(", ") : "none";
      return (
        `<tr><td><span class="method">${escapeHtml(t.method)}</span></td>` +
        `<td class="url">${escapeHtml(t.url)}</td>` +
        `<td><span class="pill ${tone}">${escapeHtml(statusText)}</span></td>` +
        `<td class="dur"><span class="dur-track"><span class="dur-fill" style="width:${String(durPct)}%"></span></span>${escapeHtml(formatDuration(durationMs))}</td>` +
        `<td class="rules">${escapeHtml(rules)}</td></tr>`
      );
    })
    .join("");

  const assertionRate =
    s.assertionsTotal > 0 ? Math.round((s.assertionsPassed / s.assertionsTotal) * 100) : 0;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QA Evidence — ${escapeHtml(report.label)}</title>
    <style>
      :root { --ok:#10b981; --warn:#f59e0b; --err:#ef4444; --muted:#9ca3af; --ink:#1f2937; --line:#e5e7eb; --bg:#f9fafb; }
      * { box-sizing: border-box; }
      body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; color: var(--ink); background: #fff; }
      .wrap { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
      header h1 { margin: 0 0 4px; font-size: 22px; }
      header .meta { color: #6b7280; font-size: 13px; }
      h2 { font-size: 16px; margin: 28px 0 12px; border-bottom: 2px solid var(--line); padding-bottom: 6px; }
      .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px; }
      .kpi { border: 1px solid var(--line); border-radius: 10px; padding: 14px; background: var(--bg); }
      .kpi .num { font-size: 26px; font-weight: 700; }
      .kpi .lbl { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
      .kpi.ok .num { color: var(--ok); } .kpi.err .num { color: var(--err); }
      .bars { display: flex; flex-direction: column; gap: 8px; max-width: 560px; }
      .bar-row { display: grid; grid-template-columns: 90px 1fr 90px; align-items: center; gap: 10px; font-size: 13px; }
      .bar-track { background: var(--line); border-radius: 999px; height: 12px; overflow: hidden; }
      .bar-fill { display: block; height: 100%; }
      .bar-fill.ok { background: var(--ok); } .bar-fill.warn { background: var(--warn); }
      .bar-fill.err { background: var(--err); } .bar-fill.muted { background: var(--muted); }
      .bar-value { text-align: right; color: #6b7280; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
      th { background: var(--bg); font-weight: 600; }
      .url { word-break: break-all; max-width: 360px; }
      .method { font-weight: 700; font-size: 12px; }
      .rules { color: #6b7280; }
      .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #fff; }
      .pill.ok { background: var(--ok); } .pill.warn { background: var(--warn); }
      .pill.err { background: var(--err); } .pill.muted { background: var(--muted); }
      .dur { white-space: nowrap; }
      .dur-track { display: inline-block; width: 60px; height: 8px; background: var(--line); border-radius: 999px; overflow: hidden; margin-right: 8px; vertical-align: middle; }
      .dur-fill { display: block; height: 100%; background: #3b82f6; }
      footer { margin-top: 32px; color: #9ca3af; font-size: 12px; border-top: 1px solid var(--line); padding-top: 12px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } h2 { page-break-after: avoid; } tr { page-break-inside: avoid; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <header>
        <h1>QA Evidence — ${escapeHtml(report.label)}</h1>
        <div class="meta">Period: ${escapeHtml(formatTimestamp(report.period.startedAt))} → ${escapeHtml(formatTimestamp(report.period.endedAt))} · Generated ${escapeHtml(formatTimestamp(report.generatedAt))}</div>
      </header>

      <section class="kpis">
        <div class="kpi"><div class="num">${String(s.totalRequests)}</div><div class="lbl">Requests</div></div>
        <div class="kpi err"><div class="num">${String(s.failedRequests)}</div><div class="lbl">Failures</div></div>
        <div class="kpi"><div class="num">${escapeHtml(formatDuration(s.averageDurationMs))}</div><div class="lbl">Avg duration</div></div>
        <div class="kpi ok"><div class="num">${String(assertionRate)}%</div><div class="lbl">Assertions passed</div></div>
        <div class="kpi"><div class="num">${String(s.uniqueRulesTriggered)}</div><div class="lbl">Rules triggered</div></div>
      </section>

      <h2>Status distribution</h2>
      <div class="bars">
        ${evidenceBar("2xx", statusBuckets.ok, totalTraffic, "ok")}
        ${evidenceBar("4xx", statusBuckets.warn, totalTraffic, "warn")}
        ${evidenceBar("5xx", statusBuckets.err, totalTraffic, "err")}
        ${evidenceBar("Pending", statusBuckets.pending, totalTraffic, "muted")}
      </div>

      ${
        assertionRows
          ? `<h2>Assertions (${String(s.assertionsPassed)}/${String(s.assertionsTotal)} passed)</h2>
      <table><thead><tr><th>#</th><th>Type</th><th>Expected</th><th>Path</th><th>Actual</th><th>Result</th></tr></thead><tbody>${assertionRows}</tbody></table>`
          : ""
      }

      <h2>Traffic waterfall</h2>
      <table><thead><tr><th>Method</th><th>URL</th><th>Status</th><th>Duration</th><th>Matched rules</th></tr></thead><tbody>${trafficRows || '<tr><td colspan="5">No traffic captured.</td></tr>'}</tbody></table>

      <footer>Generated by QA.Interceptor · ${escapeHtml(report.generatedAt)}</footer>
    </div>
  </body>
</html>`;
};

// ---------------------------------------------------------------------------
// HAR helpers
// ---------------------------------------------------------------------------

export const buildHar = (rows: RequestRow[]): object => {
  const entries = rows.map((row) => ({
    startedDateTime: row.timestamp,
    time: row.response?.durationMs ?? 0,
    request: {
      method: row.method,
      url: row.url,
      httpVersion: "HTTP/1.1",
      headers: [],
      queryString: [],
      cookies: [],
      headersSize: -1,
      bodySize: -1
    },
    response: {
      status: row.response?.status ?? 0,
      statusText: "",
      httpVersion: "HTTP/1.1",
      headers: [],
      cookies: [],
      content: { size: -1, mimeType: "application/json" },
      redirectURL: "",
      headersSize: -1,
      bodySize: -1
    },
    cache: {},
    timings: { send: 0, wait: row.response?.durationMs ?? 0, receive: 0 }
  }));

  return {
    log: {
      version: "1.2",
      creator: { name: "QA.Interceptor", version: "0.1.0" },
      entries
    }
  };
};

export const readHarAsRequestRows = (value: unknown): RequestRow[] => {
  if (!value || typeof value !== "object") {
    return [];
  }

  const root = value as Record<string, unknown>;
  const log = root.log;

  if (!log || typeof log !== "object") {
    return [];
  }

  const entries = (log as Record<string, unknown>).entries;

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => harEntryToRequestRow(entry, index))
    .filter((row): row is RequestRow => Boolean(row));
};

const harEntryToRequestRow = (entry: unknown, index: number): RequestRow | null => {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const candidate = entry as Record<string, unknown>;
  const request = candidate.request as Record<string, unknown> | undefined;
  const response = candidate.response as Record<string, unknown> | undefined;

  if (!request || typeof request !== "object") {
    return null;
  }

  const method = typeof request.method === "string" ? request.method.toUpperCase() : "GET";
  const url = typeof request.url === "string" ? request.url : "";

  if (!url) {
    return null;
  }

  const started =
    typeof candidate.startedDateTime === "string"
      ? candidate.startedDateTime
      : new Date().toISOString();
  const time =
    typeof candidate.time === "number" && Number.isFinite(candidate.time) ? candidate.time : 0;

  const headers = readHarHeaders(request.headers);
  const responseBody = readHarResponseBody(response);
  const status = response && typeof response.status === "number" ? response.status : 0;

  return {
    id: `har-${Date.now()}-${index}`,
    method,
    url,
    headers,
    timestamp: started,
    captureSource: "network",
    resourceType: "xmlhttprequest",
    tabId: -1,
    startedAtMs: new Date(started).getTime(),
    matchedRules: [],
    response: {
      status,
      durationMs: Math.max(0, Math.round(time)),
      timestamp: started,
      ...(responseBody ? { body: responseBody } : {})
    }
  };
};

const readHarHeaders = (value: unknown): Record<string, string> => {
  if (!Array.isArray(value)) {
    return {};
  }

  const pairs = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const header = item as Record<string, unknown>;

      if (typeof header.name !== "string" || typeof header.value !== "string") {
        return null;
      }

      return [header.name.toLowerCase(), header.value] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  return Object.fromEntries(pairs);
};

const readHarResponseBody = (response: Record<string, unknown> | undefined): string | undefined => {
  if (!response) {
    return undefined;
  }

  const content = response.content;

  if (!content || typeof content !== "object") {
    return undefined;
  }

  const text = (content as Record<string, unknown>).text;
  return typeof text === "string" ? text : undefined;
};

// ---------------------------------------------------------------------------
// cURL helper
// ---------------------------------------------------------------------------

export const buildCurlCommand = (row: RequestRow): string => {
  const parts = [`curl -X ${row.method}`];

  for (const [key, value] of Object.entries(row.headers ?? {})) {
    parts.push(`  -H "${key}: ${value.replace(/"/g, '\\"')}"`);
  }

  parts.push(`  "${row.url}"`);

  return parts.join(" \\\n");
};
