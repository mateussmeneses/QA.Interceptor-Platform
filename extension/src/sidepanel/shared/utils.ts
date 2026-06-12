/**
 * Pure utility functions used across sidepanel feature modules.
 * No DOM access, no chrome API calls.
 */

import type { RequestRow, HistorySession } from "./types";

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

export const formatRuleType = (type: string): string => {
  const labels: Record<string, string> = {
    "rewrite-url": "Rewrite URL",
    "rewrite-header": "Rewrite Header",
    "rewrite-query": "Rewrite Query",
    "rewrite-response": "Rewrite Response",
    "rewrite-request-body": "Rewrite Request Body",
    "mock-response": "Mock Response",
    "mock-status": "Mock Status",
    "block": "Block",
    "delay": "Delay",
    "redirect": "Redirect",
  };

  return labels[type] ?? type;
};

export const formatRuleCondition = (condition: { method?: string; urlContains?: string }): string => {
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
        pendingCount,
      };
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
};

export const computeAverageDuration = (rows: RequestRow[]): number => {
  const durations = rows
    .map((row) => row.response?.durationMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);

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

export const buildEvidenceMarkdown = (session: HistorySession): string => {
  const lines: string[] = [
    `# QA Evidence — ${session.label}`,
    ``,
    `**Period:** ${formatTimestamp(session.startedAt)} → ${formatTimestamp(session.endedAt)}`,
    `**Requests:** ${session.requests.length}  |  **Failures:** ${session.failedCount}  |  **Pending:** ${session.pendingCount}`,
    ``,
    `## Timeline`,
    ``,
  ];

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
      bodySize: -1,
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
      bodySize: -1,
    },
    cache: {},
    timings: { send: 0, wait: row.response?.durationMs ?? 0, receive: 0 },
  }));

  return {
    log: {
      version: "1.2",
      creator: { name: "QA.Interceptor", version: "0.1.0" },
      entries,
    },
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
    typeof candidate.startedDateTime === "string" ? candidate.startedDateTime : new Date().toISOString();
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
      ...(responseBody ? { body: responseBody } : {}),
    },
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
