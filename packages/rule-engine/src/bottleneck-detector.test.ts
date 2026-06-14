import { describe, it, expect } from "vitest";
import { detectBottlenecks, type BottleneckEntry } from "./bottleneck-detector.js";

const entry = (
  over: Partial<BottleneckEntry> & { id: string; durationMs: number }
): BottleneckEntry => ({
  method: "GET",
  url: `/api/${over.id}`,
  ...over
});

describe("detectBottlenecks", () => {
  it("returns empty report with zeroed stats for no measured entries", () => {
    const report = detectBottlenecks([]);
    expect(report.findings).toHaveLength(0);
    expect(report.stats.count).toBe(0);
    expect(report.stats.slowestId).toBeNull();
    expect(report.stats.averageDurationMs).toBe(0);
  });

  it("ignores entries without a measured duration", () => {
    const report = detectBottlenecks([
      { id: "a", method: "GET", url: "/a", durationMs: Number.NaN as unknown as number }
    ]);
    // NaN >= 0 is false, so it is filtered out.
    expect(report.stats.count).toBe(0);
  });

  it("flags a request that exceeds the absolute slow threshold", () => {
    const report = detectBottlenecks([
      entry({ id: "fast", durationMs: 50 }),
      entry({ id: "slow", durationMs: 1500 })
    ]);
    const finding = report.findings.find((f) => f.id === "slow");
    expect(finding).toBeDefined();
    expect(finding?.exceedsAbsolute).toBe(true);
    expect(report.findings.find((f) => f.id === "fast")).toBeUndefined();
  });

  it("does not use the relative rule when below the minimum sample size", () => {
    // Only 3 samples (< default 5); the 600ms one is p90 but must NOT be flagged
    // because there are too few samples for a meaningful percentile.
    const report = detectBottlenecks([
      entry({ id: "a", durationMs: 100 }),
      entry({ id: "b", durationMs: 200 }),
      entry({ id: "c", durationMs: 600 })
    ]);
    expect(report.findings).toHaveLength(0);
  });

  it("flags the p90 request when there are enough samples", () => {
    const entries = [
      entry({ id: "a", durationMs: 100 }),
      entry({ id: "b", durationMs: 120 }),
      entry({ id: "c", durationMs: 140 }),
      entry({ id: "d", durationMs: 160 }),
      entry({ id: "e", durationMs: 180 }),
      entry({ id: "slow", durationMs: 700 })
    ];
    const report = detectBottlenecks(entries);
    const finding = report.findings.find((f) => f.id === "slow");
    expect(finding).toBeDefined();
    expect(finding?.exceedsRelative).toBe(true);
  });

  it("classifies server-latency when waiting dominates", () => {
    const report = detectBottlenecks([
      entry({ id: "slow", durationMs: 1200, waitingMs: 1100, downloadMs: 100 })
    ]);
    expect(report.findings[0].reason).toBe("server-latency");
    expect(report.findings[0].detail).toContain("Server latency");
  });

  it("classifies transfer-size when download dominates", () => {
    const report = detectBottlenecks([
      entry({ id: "slow", durationMs: 1200, waitingMs: 200, downloadMs: 1000 })
    ]);
    expect(report.findings[0].reason).toBe("transfer-size");
  });

  it("classifies mixed when no phase dominates", () => {
    const report = detectBottlenecks([
      entry({ id: "slow", durationMs: 1200, waitingMs: 600, downloadMs: 600 })
    ]);
    expect(report.findings[0].reason).toBe("mixed");
  });

  it("classifies slow when no breakdown is available", () => {
    const report = detectBottlenecks([entry({ id: "slow", durationMs: 1200 })]);
    expect(report.findings[0].reason).toBe("slow");
  });

  it("computes stats and identifies the slowest request", () => {
    const report = detectBottlenecks([
      entry({ id: "a", durationMs: 100 }),
      entry({ id: "b", durationMs: 300 }),
      entry({ id: "c", durationMs: 200 })
    ]);
    expect(report.stats.count).toBe(3);
    expect(report.stats.maxDurationMs).toBe(300);
    expect(report.stats.slowestId).toBe("b");
    expect(report.stats.averageDurationMs).toBe(200);
  });

  it("sorts findings by descending duration", () => {
    const report = detectBottlenecks([
      entry({ id: "x", durationMs: 1100 }),
      entry({ id: "y", durationMs: 2000 }),
      entry({ id: "z", durationMs: 1500 })
    ]);
    expect(report.findings.map((f) => f.id)).toEqual(["y", "z", "x"]);
  });

  it("honours custom thresholds", () => {
    const report = detectBottlenecks([entry({ id: "a", durationMs: 500 })], {
      absoluteSlowMs: 400
    });
    expect(report.findings).toHaveLength(1);
  });
});
