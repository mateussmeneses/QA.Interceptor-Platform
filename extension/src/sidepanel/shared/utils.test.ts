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
  getUniqueMatchedRulesCount
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
