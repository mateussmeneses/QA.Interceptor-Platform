/**
 * Performance bottleneck detector (PERF-001).
 *
 * Analyses a set of captured requests and flags the ones that behave as
 * performance bottlenecks, classifying *why* using the honest timing signals
 * available in MV3 (total duration, and — when present — the waiting/download
 * split produced by PERF-002).
 *
 * A request is flagged when it is slow in absolute terms OR slow relative to
 * the rest of the captured traffic (>= p90 with enough samples). The reason is
 * derived from the waiting/download breakdown when available, never fabricated.
 *
 * Pure functions only — no chrome API, no DOM. Fully testable.
 */

export type BottleneckEntry = {
  id: string;
  method: string;
  url: string;
  durationMs: number;
  /** Time-to-first-byte phase (PERF-002), when available. */
  waitingMs?: number;
  /** Transfer phase (PERF-002), when available. */
  downloadMs?: number;
  /** Response payload size in bytes, when known. */
  bytes?: number;
};

export type BottleneckReason =
  | "server-latency" // waiting (TTFB) dominates the request time
  | "transfer-size" // download (transfer) dominates the request time
  | "slow" // overall slow, no breakdown available to attribute a cause
  | "mixed"; // breakdown available but no single phase dominates

export type BottleneckFinding = {
  id: string;
  method: string;
  url: string;
  durationMs: number;
  reason: BottleneckReason;
  /** True when flagged because it crossed the absolute slow threshold. */
  exceedsAbsolute: boolean;
  /** True when flagged because it sits at/above the relative (p90) threshold. */
  exceedsRelative: boolean;
  detail: string;
};

export type BottleneckStats = {
  count: number;
  averageDurationMs: number;
  p50DurationMs: number;
  p90DurationMs: number;
  maxDurationMs: number;
  slowestId: string | null;
};

export type BottleneckReport = {
  findings: BottleneckFinding[];
  stats: BottleneckStats;
};

export type BottleneckOptions = {
  /** Absolute duration (ms) at/above which a request is always a bottleneck. */
  absoluteSlowMs?: number;
  /** Minimum duration (ms) required before relative (p90) flagging applies. */
  relativeFloorMs?: number;
  /** Minimum sample size required for the relative (p90) rule to apply. */
  minSamplesForPercentile?: number;
  /** Share of total time in the waiting phase to classify as server-latency. */
  waitingDominanceRatio?: number;
  /** Share of total time in the download phase to classify as transfer-size. */
  downloadDominanceRatio?: number;
};

const DEFAULTS: Required<BottleneckOptions> = {
  absoluteSlowMs: 1000,
  relativeFloorMs: 300,
  minSamplesForPercentile: 5,
  waitingDominanceRatio: 0.7,
  downloadDominanceRatio: 0.6
};

/**
 * Nearest-rank percentile over a numeric series. Returns 0 for empty input.
 */
const percentile = (sortedAsc: number[], fraction: number): number => {
  if (sortedAsc.length === 0) {
    return 0;
  }

  const rank = Math.ceil(fraction * sortedAsc.length);
  const index = Math.min(sortedAsc.length - 1, Math.max(0, rank - 1));
  return sortedAsc[index];
};

const classifyReason = (
  entry: BottleneckEntry,
  options: Required<BottleneckOptions>
): BottleneckReason => {
  const { waitingMs, downloadMs } = entry;

  if (typeof waitingMs !== "number" || typeof downloadMs !== "number") {
    return "slow";
  }

  const total = waitingMs + downloadMs;

  if (total <= 0) {
    return "slow";
  }

  if (waitingMs / total >= options.waitingDominanceRatio) {
    return "server-latency";
  }

  if (downloadMs / total >= options.downloadDominanceRatio) {
    return "transfer-size";
  }

  return "mixed";
};

const buildDetail = (entry: BottleneckEntry, reason: BottleneckReason): string => {
  switch (reason) {
    case "server-latency":
      return `Server latency dominates: ${String(entry.waitingMs)} ms waiting (TTFB) of ${String(entry.durationMs)} ms total.`;
    case "transfer-size":
      return `Transfer dominates: ${String(entry.downloadMs)} ms downloading of ${String(entry.durationMs)} ms total.`;
    case "mixed":
      return `Slow request (${String(entry.durationMs)} ms) with no single dominant phase.`;
    case "slow":
    default:
      return `Slow request (${String(entry.durationMs)} ms); no timing breakdown available.`;
  }
};

/**
 * Detects performance bottlenecks across a set of captured requests.
 *
 * Only entries with a measured `durationMs` participate. A request is flagged
 * when it crosses the absolute slow threshold, or when it sits at/above the
 * dataset p90 (with enough samples and above the relative floor).
 */
export const detectBottlenecks = (
  entries: BottleneckEntry[],
  options: BottleneckOptions = {}
): BottleneckReport => {
  const config = { ...DEFAULTS, ...options };
  const measured = entries.filter(
    (entry) => typeof entry.durationMs === "number" && entry.durationMs >= 0
  );

  const durations = measured.map((entry) => entry.durationMs).sort((a, b) => a - b);
  const count = durations.length;

  const stats: BottleneckStats = {
    count,
    averageDurationMs:
      count > 0 ? Math.round(durations.reduce((sum, value) => sum + value, 0) / count) : 0,
    p50DurationMs: percentile(durations, 0.5),
    p90DurationMs: percentile(durations, 0.9),
    maxDurationMs: count > 0 ? durations[count - 1] : 0,
    slowestId: null
  };

  if (count === 0) {
    return { findings: [], stats };
  }

  const slowest = measured.reduce((slowestEntry, entry) =>
    entry.durationMs > slowestEntry.durationMs ? entry : slowestEntry
  );
  stats.slowestId = slowest.id;

  const canUsePercentile = count >= config.minSamplesForPercentile;

  const findings: BottleneckFinding[] = [];

  for (const entry of measured) {
    const exceedsAbsolute = entry.durationMs >= config.absoluteSlowMs;
    const exceedsRelative =
      canUsePercentile &&
      entry.durationMs >= stats.p90DurationMs &&
      entry.durationMs >= config.relativeFloorMs;

    if (!exceedsAbsolute && !exceedsRelative) {
      continue;
    }

    const reason = classifyReason(entry, config);

    findings.push({
      id: entry.id,
      method: entry.method,
      url: entry.url,
      durationMs: entry.durationMs,
      reason,
      exceedsAbsolute,
      exceedsRelative,
      detail: buildDetail(entry, reason)
    });
  }

  findings.sort((a, b) => b.durationMs - a.durationMs);

  return { findings, stats };
};
