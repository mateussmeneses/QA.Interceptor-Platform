import { describe, it, expect } from "vitest";
import { detectRegressions, type TrafficSnapshotEntry } from "./regression-detector.js";

const base: TrafficSnapshotEntry[] = [
  { method: "GET", url: "/api/users", status: 200, body: '{"id":1,"name":"A","active":true}' },
  { method: "POST", url: "/api/orders", status: 201, body: '{"orderId":10}' },
  { method: "GET", url: "/api/legacy", status: 200, body: "{}" }
];

describe("detectRegressions", () => {
  it("reports no findings when current matches baseline", () => {
    const report = detectRegressions(base, base);
    expect(report.findings).toHaveLength(0);
    expect(report.hasErrors).toBe(false);
    expect(report.comparedEndpoints).toBe(3);
  });

  it("flags a missing endpoint as warning", () => {
    const current = base.filter((e) => e.url !== "/api/legacy");
    const report = detectRegressions(base, current);
    const f = report.findings.find((x) => x.kind === "missing-endpoint");
    expect(f?.url).toBe("/api/legacy");
    expect(f?.severity).toBe("warning");
  });

  it("flags a new endpoint as info", () => {
    const current = [...base, { method: "GET", url: "/api/new", status: 200, body: "{}" }];
    const report = detectRegressions(base, current);
    const f = report.findings.find((x) => x.kind === "new-endpoint");
    expect(f?.url).toBe("/api/new");
    expect(f?.severity).toBe("info");
  });

  it("flags a 2xx→5xx status change as error", () => {
    const current = base.map((e) => (e.url === "/api/users" ? { ...e, status: 500 } : e));
    const report = detectRegressions(base, current);
    const f = report.findings.find((x) => x.kind === "status-change");
    expect(f?.severity).toBe("error");
    expect(report.hasErrors).toBe(true);
  });

  it("flags a structural contract change (missing key) as error", () => {
    const current = base.map((e) =>
      e.url === "/api/users" ? { ...e, body: '{"id":1,"active":true}' } : e
    );
    const report = detectRegressions(base, current);
    const f = report.findings.find((x) => x.kind === "contract-change");
    expect(f?.severity).toBe("error");
    expect(f?.detail).toContain("name");
  });

  it("does not flag value-only changes (structural diff ignores values)", () => {
    const current = base.map((e) =>
      e.url === "/api/users" ? { ...e, body: '{"id":999,"name":"Z","active":false}' } : e
    );
    const report = detectRegressions(base, current);
    expect(report.findings.filter((f) => f.kind === "contract-change")).toHaveLength(0);
  });

  it("matches endpoints case-insensitively by method", () => {
    const current: TrafficSnapshotEntry[] = [
      { method: "get", url: "/api/users", status: 200, body: '{"id":1,"name":"A","active":true}' }
    ];
    const report = detectRegressions([base[0]], current);
    expect(report.findings).toHaveLength(0);
    expect(report.comparedEndpoints).toBe(1);
  });
});
