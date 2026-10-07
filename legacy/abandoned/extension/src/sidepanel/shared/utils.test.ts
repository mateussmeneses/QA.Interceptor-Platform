import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  formatDuration,
  getStatusToneClass,
  getTimelineWidthPercent,
  byteLength,
  formatBytes,
  formatRuleType,
  summarizeRuleAction,
  formatThroughput,
  formatRuleCondition,
  renderRuleChips,
  buildHistorySessions,
  computeAverageDuration,
  getUniqueMatchedRulesCount,
  buildDiagnosticsReport,
  buildSearchHaystack,
  matchesSearchQuery,
  paginate
} from "./utils";
import type { RequestRow } from "./types";

const makeRow = (over: Partial<RequestRow> & { id: string }): RequestRow => ({
  method: "GET",
  url: `/api/${over.id}`,
  headers: {},
  timestamp: "2026-06-14T12:00:00.000Z",
  captureSource: "network",
  startedAtMs: 0,
  matchedRules: [],
  ...over
});

describe("escapeHtml", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(escapeHtml('<a href="x">&\'')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });

  it("leaves safe text unchanged", () => {
    expect(escapeHtml("plain text 123")).toBe("plain text 123");
  });
});

describe("formatDuration", () => {
  it("renders milliseconds", () => {
    expect(formatDuration(0)).toBe("0 ms");
    expect(formatDuration(1234)).toBe("1234 ms");
  });
});

describe("getStatusToneClass", () => {
  it("maps status ranges to tones", () => {
    expect(getStatusToneClass(undefined)).toBe("pending");
    expect(getStatusToneClass(200)).toBe("ok");
    expect(getStatusToneClass(204)).toBe("ok");
    expect(getStatusToneClass(301)).toBe("redirect");
    expect(getStatusToneClass(404)).toBe("client");
    expect(getStatusToneClass(500)).toBe("server");
  });
});

describe("getTimelineWidthPercent", () => {
  it("returns 0 for missing or non-positive durations", () => {
    expect(getTimelineWidthPercent(undefined)).toBe(0);
    expect(getTimelineWidthPercent(0)).toBe(0);
  });

  it("clamps between 4 and 100", () => {
    expect(getTimelineWidthPercent(10)).toBe(4);
    expect(getTimelineWidthPercent(5000)).toBe(100);
  });
});

describe("byteLength", () => {
  it("returns 0 for empty/undefined", () => {
    expect(byteLength(undefined)).toBe(0);
    expect(byteLength("")).toBe(0);
  });

  it("counts UTF-8 bytes (multi-byte chars)", () => {
    expect(byteLength("abc")).toBe(3);
    expect(byteLength("é")).toBe(2);
    expect(byteLength("😀")).toBe(4);
  });
});

describe("formatBytes", () => {
  it("formats across units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });
});

describe("formatRuleType / summarizeRuleAction", () => {
  it("returns the catalog label for a known type", () => {
    expect(formatRuleType("mock-response")).toBe("Mock Response");
    expect(formatRuleType("rewrite-url")).toBe("Rewrite URL");
  });

  it("falls back to the raw type when unknown", () => {
    expect(formatRuleType("totally-unknown")).toBe("totally-unknown");
  });

  it("returns an action summary for a known type and a fallback otherwise", () => {
    expect(summarizeRuleAction("block")).toContain("blocked");
    expect(summarizeRuleAction("unknown")).toContain("rule matched");
  });
});

describe("formatThroughput", () => {
  it("returns an em dash for null or non-positive rates", () => {
    expect(formatThroughput(null)).toBe("—");
    expect(formatThroughput(0)).toBe("—");
    expect(formatThroughput(-5)).toBe("—");
  });

  it("formats a positive rate using byte units per second", () => {
    expect(formatThroughput(512)).toBe("512 B/s");
    expect(formatThroughput(2048)).toBe("2.0 KB/s");
  });
});

describe("formatRuleCondition", () => {
  it("describes method and url together", () => {
    expect(formatRuleCondition({ method: "POST", urlContains: "/orders" })).toBe(
      "Method: POST • URL contains: /orders"
    );
  });

  it("describes a single dimension", () => {
    expect(formatRuleCondition({ method: "GET" })).toBe("Method: GET");
    expect(formatRuleCondition({ urlContains: "/api" })).toBe("URL contains: /api");
  });

  it("falls back to 'Always on' when unconditioned", () => {
    expect(formatRuleCondition({})).toBe("Always on");
  });
});

describe("renderRuleChips", () => {
  it("renders a muted placeholder when no rules matched", () => {
    expect(renderRuleChips([])).toContain("No rules matched");
  });

  it("escapes rule names to prevent HTML injection", () => {
    const html = renderRuleChips([{ ruleId: "r1", ruleName: "<img src=x>", type: "block" }]);
    expect(html).toContain("&lt;img src=x&gt;");
    expect(html).not.toContain("<img src=x>");
  });
});

describe("buildHistorySessions", () => {
  it("returns no sessions for empty input", () => {
    expect(buildHistorySessions([])).toEqual([]);
  });

  it("groups requests into 15-minute buckets and counts failures/pending", () => {
    const rows: RequestRow[] = [
      makeRow({
        id: "a",
        timestamp: "2026-06-14T12:00:00.000Z",
        response: { status: 200, durationMs: 10, timestamp: "2026-06-14T12:00:00.100Z" }
      }),
      makeRow({
        id: "b",
        timestamp: "2026-06-14T12:05:00.000Z",
        response: { status: 500, durationMs: 20, timestamp: "2026-06-14T12:05:00.200Z" }
      }),
      makeRow({ id: "c", timestamp: "2026-06-14T12:40:00.000Z" })
    ];
    const sessions = buildHistorySessions(rows);
    expect(sessions).toHaveLength(2);
    // Most recent session first
    const [recent, older] = sessions;
    expect(recent.requests).toHaveLength(1);
    expect(recent.pendingCount).toBe(1);
    expect(older.requests).toHaveLength(2);
    expect(older.failedCount).toBe(1);
  });

  it("skips rows with invalid timestamps", () => {
    const sessions = buildHistorySessions([makeRow({ id: "x", timestamp: "not-a-date" })]);
    expect(sessions).toEqual([]);
  });
});

describe("computeAverageDuration", () => {
  it("returns 0 when there are no measured responses", () => {
    expect(computeAverageDuration([makeRow({ id: "a" })])).toBe(0);
  });

  it("averages only measured durations and rounds", () => {
    const rows = [
      makeRow({ id: "a", response: { status: 200, durationMs: 100, timestamp: "" } }),
      makeRow({ id: "b", response: { status: 200, durationMs: 201, timestamp: "" } }),
      makeRow({ id: "c" })
    ];
    expect(computeAverageDuration(rows)).toBe(151);
  });
});

describe("getUniqueMatchedRulesCount", () => {
  it("counts distinct matched rule ids across rows", () => {
    const rows = [
      makeRow({
        id: "a",
        matchedRules: [
          { ruleId: "r1", ruleName: "A", type: "block" },
          { ruleId: "r2", ruleName: "B", type: "delay" }
        ]
      }),
      makeRow({ id: "b", matchedRules: [{ ruleId: "r1", ruleName: "A", type: "block" }] })
    ];
    expect(getUniqueMatchedRulesCount(rows)).toBe(2);
  });

  it("returns 0 when no rules matched", () => {
    expect(getUniqueMatchedRulesCount([makeRow({ id: "a" })])).toBe(0);
  });
});

describe("buildDiagnosticsReport", () => {
  const baseInput = {
    rules: [
      { enabled: true, type: "block" },
      { enabled: false, type: "delay" }
    ],
    ruleGroups: [{}, {}],
    requests: [
      makeRow({ id: "a", response: { status: 200, durationMs: 100, timestamp: "" } }),
      makeRow({ id: "b", response: { status: 500, durationMs: 300, timestamp: "" } }),
      makeRow({ id: "c" })
    ],
    assertions: [],
    conditionalMocks: [{}]
  };

  it("produces valid JSON with tool metadata and the provided clock/UA", () => {
    const json = buildDiagnosticsReport(baseInput, "2026-06-14T00:00:00.000Z", "test-agent/1.0");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.tool).toBe("QA.Interceptor");
    expect(parsed.generatedAt).toBe("2026-06-14T00:00:00.000Z");
    expect((parsed.environment as { userAgent: string }).userAgent).toBe("test-agent/1.0");
  });

  it("summarizes counts including failed and pending requests", () => {
    const json = buildDiagnosticsReport(baseInput, "2026-06-14T00:00:00.000Z", "ua");
    const summary = (JSON.parse(json) as { summary: Record<string, number> }).summary;
    expect(summary.rules).toBe(2);
    expect(summary.enabledRules).toBe(1);
    expect(summary.ruleGroups).toBe(2);
    expect(summary.conditionalMocks).toBe(1);
    expect(summary.capturedRequests).toBe(3);
    expect(summary.failedRequests).toBe(1);
    expect(summary.pendingRequests).toBe(1);
    expect(summary.averageDurationMs).toBe(200);
  });

  it("caps recent requests at 20 entries", () => {
    const many = Array.from({ length: 30 }, (_, i) => makeRow({ id: `r${String(i)}` }));
    const json = buildDiagnosticsReport(
      { ...baseInput, requests: many },
      "2026-06-14T00:00:00.000Z",
      "ua"
    );
    const recent = (JSON.parse(json) as { recentRequests: unknown[] }).recentRequests;
    expect(recent).toHaveLength(20);
  });
});

describe("buildSearchHaystack / matchesSearchQuery (QAI-005)", () => {
  const row = makeRow({
    id: "a",
    method: "POST",
    url: "https://api.example.com/api/orders",
    headers: { authorization: "Bearer secret-token" },
    body: '{"item":"sku-42"}',
    matchedRules: [{ ruleId: "r1", ruleName: "Block Orders", type: "block" }],
    response: {
      status: 503,
      durationMs: 12,
      timestamp: "",
      headers: { "x-trace": "abc123" },
      body: '{"error":"unavailable"}'
    }
  });

  it("includes URL, method, headers, body, rules and response fields", () => {
    const hay = buildSearchHaystack(row);
    expect(hay).toContain("post");
    expect(hay).toContain("/api/orders");
    expect(hay).toContain("authorization");
    expect(hay).toContain("bearer secret-token");
    expect(hay).toContain("sku-42");
    expect(hay).toContain("block orders");
    expect(hay).toContain("503");
    expect(hay).toContain("x-trace");
    expect(hay).toContain("unavailable");
  });

  it("matches an empty query against any row", () => {
    expect(matchesSearchQuery(row, "")).toBe(true);
    expect(matchesSearchQuery(row, "   ")).toBe(true);
  });

  it("matches a substring in the request body", () => {
    expect(matchesSearchQuery(row, "sku-42")).toBe(true);
  });

  it("matches a substring in the response body", () => {
    expect(matchesSearchQuery(row, "unavailable")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesSearchQuery(row, "BEARER")).toBe(true);
  });

  it("requires ALL terms to be present (AND semantics)", () => {
    expect(matchesSearchQuery(row, "orders 503")).toBe(true);
    expect(matchesSearchQuery(row, "orders 200")).toBe(false);
  });

  it("returns false when no field contains the term", () => {
    expect(matchesSearchQuery(row, "nonexistent-xyz")).toBe(false);
  });

  it("handles rows without a response", () => {
    const pending = makeRow({ id: "b", url: "https://x.com/health" });
    expect(matchesSearchQuery(pending, "health")).toBe(true);
    expect(matchesSearchQuery(pending, "503")).toBe(false);
  });
});

describe("paginate (QAI-011)", () => {
  const items = Array.from({ length: 125 }, (_, i) => i + 1);

  it("returns the first page with correct slice and metadata", () => {
    const r = paginate(items, 1, 50);
    expect(r.items).toHaveLength(50);
    expect(r.items[0]).toBe(1);
    expect(r.page).toBe(1);
    expect(r.totalPages).toBe(3);
    expect(r.totalItems).toBe(125);
    expect(r.startIndex).toBe(1);
    expect(r.endIndex).toBe(50);
  });

  it("returns a partial last page", () => {
    const r = paginate(items, 3, 50);
    expect(r.items).toHaveLength(25);
    expect(r.items[0]).toBe(101);
    expect(r.startIndex).toBe(101);
    expect(r.endIndex).toBe(125);
  });

  it("clamps a page above the range to the last page", () => {
    const r = paginate(items, 99, 50);
    expect(r.page).toBe(3);
  });

  it("clamps a page below 1 to the first page", () => {
    expect(paginate(items, 0, 50).page).toBe(1);
    expect(paginate(items, -5, 50).page).toBe(1);
  });

  it("handles an empty list with zeroed indices and one page", () => {
    const r = paginate([], 1, 50);
    expect(r.items).toHaveLength(0);
    expect(r.totalPages).toBe(1);
    expect(r.startIndex).toBe(0);
    expect(r.endIndex).toBe(0);
  });

  it("treats a non-positive page size as at least 1", () => {
    const r = paginate(items, 1, 0);
    expect(r.pageSize).toBe(1);
    expect(r.items).toHaveLength(1);
  });
});
