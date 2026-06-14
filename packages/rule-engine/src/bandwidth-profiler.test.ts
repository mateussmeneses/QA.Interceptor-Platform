import { describe, it, expect } from "vitest";
import { profileBandwidth, type BandwidthEntry } from "./bandwidth-profiler.js";

const entry = (over: Partial<BandwidthEntry> & { url: string }): BandwidthEntry => ({
  method: "GET",
  bytes: 0,
  ...over
});

describe("profileBandwidth", () => {
  it("returns an empty report for no entries", () => {
    const report = profileBandwidth([]);
    expect(report.endpoints).toHaveLength(0);
    expect(report.totalBytes).toBe(0);
    expect(report.totalRequests).toBe(0);
    expect(report.measuredRequests).toBe(0);
  });

  it("aggregates bytes per endpoint", () => {
    const report = profileBandwidth([
      entry({ url: "/a", bytes: 100 }),
      entry({ url: "/a", bytes: 300 }),
      entry({ url: "/b", bytes: 50 })
    ]);
    const a = report.endpoints.find((e) => e.url === "/a");
    expect(a?.requestCount).toBe(2);
    expect(a?.totalBytes).toBe(400);
    expect(a?.averageBytes).toBe(200);
    expect(report.totalBytes).toBe(450);
  });

  it("treats different methods on the same url as distinct endpoints", () => {
    const report = profileBandwidth([
      entry({ url: "/x", method: "GET", bytes: 100 }),
      entry({ url: "/x", method: "POST", bytes: 200 })
    ]);
    expect(report.endpoints).toHaveLength(2);
  });

  it("sorts endpoints by descending total bytes", () => {
    const report = profileBandwidth([
      entry({ url: "/small", bytes: 10 }),
      entry({ url: "/big", bytes: 1000 }),
      entry({ url: "/medium", bytes: 100 })
    ]);
    expect(report.endpoints.map((e) => e.url)).toEqual(["/big", "/medium", "/small"]);
  });

  it("computes byte share relative to the total", () => {
    const report = profileBandwidth([
      entry({ url: "/a", bytes: 750 }),
      entry({ url: "/b", bytes: 250 })
    ]);
    const a = report.endpoints.find((e) => e.url === "/a");
    expect(a?.byteShare).toBeCloseTo(0.75, 5);
  });

  it("computes throughput in bytes/sec from total duration", () => {
    // 1000 bytes over 500 ms => 2000 bytes/sec
    const report = profileBandwidth([entry({ url: "/a", bytes: 1000, durationMs: 500 })]);
    expect(report.endpoints[0].throughputBytesPerSec).toBe(2000);
  });

  it("prefers the download phase over total duration for throughput", () => {
    // 1000 bytes; downloadMs=250 should be used (=> 4000 b/s), not durationMs=1000
    const report = profileBandwidth([
      entry({ url: "/a", bytes: 1000, durationMs: 1000, downloadMs: 250 })
    ]);
    expect(report.endpoints[0].throughputBytesPerSec).toBe(4000);
  });

  it("returns null throughput when no time was measured", () => {
    const report = profileBandwidth([entry({ url: "/a", bytes: 500 })]);
    expect(report.endpoints[0].throughputBytesPerSec).toBeNull();
  });

  it("returns null throughput when the endpoint transferred zero bytes", () => {
    const report = profileBandwidth([entry({ url: "/a", bytes: 0, durationMs: 100 })]);
    expect(report.endpoints[0].throughputBytesPerSec).toBeNull();
  });

  it("counts only entries with known bytes as measured requests", () => {
    const report = profileBandwidth([
      entry({ url: "/a", bytes: 100 }),
      entry({ url: "/b", bytes: 0 }),
      entry({ url: "/c", bytes: 50 })
    ]);
    expect(report.totalRequests).toBe(3);
    expect(report.measuredRequests).toBe(2);
  });
});
