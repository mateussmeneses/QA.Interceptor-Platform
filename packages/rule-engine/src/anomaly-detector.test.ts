import { describe, it, expect } from "vitest";
import { detectAnomalies, type AnomalyEntry } from "./anomaly-detector.js";

const entry = (over: Partial<AnomalyEntry> & { url: string }): AnomalyEntry => ({
  method: "GET",
  ...over
});

describe("detectAnomalies", () => {
  it("returns an empty report for no entries", () => {
    const report = detectAnomalies([]);
    expect(report.findings).toHaveLength(0);
    expect(report.analyzedRequests).toBe(0);
    expect(report.analyzedEndpoints).toBe(0);
  });

  it("flags an endpoint with a high error ratio", () => {
    const report = detectAnomalies([
      entry({ url: "/a", status: 500 }),
      entry({ url: "/a", status: 500 }),
      entry({ url: "/a", status: 200 })
    ]);
    const finding = report.findings.find((f) => f.kind === "error-rate");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("warning");
    expect(finding?.detail).toContain("67% errors");
  });

  it("escalates to error severity at very high error ratios", () => {
    const report = detectAnomalies([
      entry({ url: "/a", status: 500 }),
      entry({ url: "/a", status: 503 }),
      entry({ url: "/a", status: 500 }),
      entry({ url: "/a", status: 200 })
    ]);
    // 3/4 = 75% -> warning still (below 0.8)
    expect(report.findings.find((f) => f.kind === "error-rate")?.severity).toBe("warning");

    const allErrors = detectAnomalies([
      entry({ url: "/b", status: 500 }),
      entry({ url: "/b", status: 500 }),
      entry({ url: "/b", status: 500 })
    ]);
    expect(allErrors.findings.find((f) => f.kind === "error-rate")?.severity).toBe("error");
  });

  it("does not flag error-rate below the minimum request count", () => {
    const report = detectAnomalies([
      entry({ url: "/a", status: 500 }),
      entry({ url: "/a", status: 500 })
    ]);
    expect(report.findings.find((f) => f.kind === "error-rate")).toBeUndefined();
  });

  it("flags a latency outlier using robust statistics", () => {
    const report = detectAnomalies([
      entry({ url: "/a", durationMs: 100 }),
      entry({ url: "/a", durationMs: 110 }),
      entry({ url: "/a", durationMs: 105 }),
      entry({ url: "/a", durationMs: 108 }),
      entry({ url: "/a", durationMs: 2000 })
    ]);
    const finding = report.findings.find((f) => f.kind === "latency-outlier");
    expect(finding).toBeDefined();
    expect(finding?.detail).toContain("2000 ms");
  });

  it("does not flag latency outliers when there is no dispersion", () => {
    const report = detectAnomalies([
      entry({ url: "/a", durationMs: 100 }),
      entry({ url: "/a", durationMs: 100 }),
      entry({ url: "/a", durationMs: 100 }),
      entry({ url: "/a", durationMs: 100 })
    ]);
    expect(report.findings.find((f) => f.kind === "latency-outlier")).toBeUndefined();
  });

  it("does not flag latency outliers below the minimum sample size", () => {
    const report = detectAnomalies([
      entry({ url: "/a", durationMs: 100 }),
      entry({ url: "/a", durationMs: 110 }),
      entry({ url: "/a", durationMs: 5000 })
    ]);
    expect(report.findings.find((f) => f.kind === "latency-outlier")).toBeUndefined();
  });

  it("respects the latency floor for tiny absolute spikes", () => {
    // Spike is a statistical outlier but below the 200ms floor -> not flagged.
    const report = detectAnomalies([
      entry({ url: "/a", durationMs: 10 }),
      entry({ url: "/a", durationMs: 11 }),
      entry({ url: "/a", durationMs: 10 }),
      entry({ url: "/a", durationMs: 12 }),
      entry({ url: "/a", durationMs: 150 })
    ]);
    expect(report.findings.find((f) => f.kind === "latency-outlier")).toBeUndefined();
  });

  it("flags a payload outlier", () => {
    const report = detectAnomalies([
      entry({ url: "/a", bytes: 500 }),
      entry({ url: "/a", bytes: 520 }),
      entry({ url: "/a", bytes: 510 }),
      entry({ url: "/a", bytes: 505 }),
      entry({ url: "/a", bytes: 50000 })
    ]);
    const finding = report.findings.find((f) => f.kind === "payload-outlier");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("info");
  });

  it("sorts findings by severity (error, warning, info)", () => {
    const report = detectAnomalies([
      // error-rate -> error
      entry({ url: "/err", status: 500 }),
      entry({ url: "/err", status: 500 }),
      entry({ url: "/err", status: 500 }),
      // payload outlier -> info
      entry({ url: "/big", bytes: 100 }),
      entry({ url: "/big", bytes: 110 }),
      entry({ url: "/big", bytes: 105 }),
      entry({ url: "/big", bytes: 108 }),
      entry({ url: "/big", bytes: 90000 })
    ]);
    const kinds = report.findings.map((f) => f.severity);
    expect(kinds[0]).toBe("error");
    expect(kinds[kinds.length - 1]).toBe("info");
  });

  it("honours custom thresholds", () => {
    const report = detectAnomalies(
      [entry({ url: "/a", status: 500 }), entry({ url: "/a", status: 200 })],
      {
        minRequestsForErrorRate: 2,
        errorRateThreshold: 0.4
      }
    );
    expect(report.findings.find((f) => f.kind === "error-rate")).toBeDefined();
  });
});
