/**
 * Traffic anomaly detector (OBS-008).
 *
 * Flags anomalies *within the currently captured traffic* using robust
 * statistics — no historical baseline required (that is OBS-006/007's job).
 * It surfaces three honest, self-contained anomaly classes per endpoint:
 *
 *  - error-rate:     an endpoint failing far more often than it succeeds.
 *  - latency-outlier: a request much slower than its endpoint's typical time.
 *  - payload-outlier: a response much larger than its endpoint's typical size.
 *
 * Outliers use the median + MAD (median absolute deviation) modified z-score,
 * which is robust to small samples and skew. Every threshold is configurable.
 *
 * Pure functions only — no chrome API, no DOM. Fully testable.
 */

export type AnomalyEntry = {
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  bytes?: number;
};

export type AnomalyKind = "error-rate" | "latency-outlier" | "payload-outlier";

export type AnomalySeverity = "error" | "warning" | "info";

export type AnomalyFinding = {
  kind: AnomalyKind;
  severity: AnomalySeverity;
  method: string;
  url: string;
  detail: string;
};

export type AnomalyReport = {
  findings: AnomalyFinding[];
  analyzedRequests: number;
  analyzedEndpoints: number;
};

export type AnomalyOptions = {
  /** Minimum requests on an endpoint before the error-rate rule applies. */
  minRequestsForErrorRate?: number;
  /** Error ratio (0..1) at/above which an endpoint is flagged. */
  errorRateThreshold?: number;
  /** Minimum samples before outlier (latency/payload) rules apply. */
  minSamplesForOutlier?: number;
  /** Modified z-score at/above which a value is an outlier. */
  outlierZThreshold?: number;
  /** Latency floor (ms): values below this are never latency outliers. */
  latencyFloorMs?: number;
  /** Payload floor (bytes): values below this are never payload outliers. */
  payloadFloorBytes?: number;
};

const DEFAULTS: Required<AnomalyOptions> = {
  minRequestsForErrorRate: 3,
  errorRateThreshold: 0.5,
  minSamplesForOutlier: 4,
  outlierZThreshold: 3.5,
  latencyFloorMs: 200,
  payloadFloorBytes: 1024
};

const keyOf = (entry: { method: string; url: string }): string =>
  `${entry.method.toUpperCase()} ${entry.url}`;

const median = (sortedAsc: number[]): number => {
  const n = sortedAsc.length;
  if (n === 0) {
    return 0;
  }
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sortedAsc[mid - 1] + sortedAsc[mid]) / 2 : sortedAsc[mid];
};

/**
 * Returns the maximum modified z-score value and its score for a series,
 * using median + MAD. Returns null when the series is too small or has no
 * dispersion (MAD === 0), which would make every point look identical.
 */
const maxModifiedZ = (
  values: number[]
): { value: number; score: number; median: number } | null => {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const med = median(sorted);
  const deviations = sorted.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  const mad = median(deviations);

  if (mad === 0) {
    return null;
  }

  let best = { value: values[0], score: 0, median: med };
  for (const value of values) {
    const score = Math.abs((0.6745 * (value - med)) / mad);
    if (score > best.score) {
      best = { value, score, median: med };
    }
  }

  return best;
};

type Bucket = {
  method: string;
  url: string;
  total: number;
  errors: number;
  durations: number[];
  sizes: number[];
};

const isError = (status: number | undefined): boolean =>
  typeof status === "number" && status >= 400;

export const detectAnomalies = (
  entries: AnomalyEntry[],
  options: AnomalyOptions = {}
): AnomalyReport => {
  const config = { ...DEFAULTS, ...options };
  const buckets = new Map<string, Bucket>();

  for (const entry of entries) {
    const key = keyOf(entry);
    const bucket = buckets.get(key) ?? {
      method: entry.method,
      url: entry.url,
      total: 0,
      errors: 0,
      durations: [],
      sizes: []
    };

    bucket.total += 1;
    if (isError(entry.status)) {
      bucket.errors += 1;
    }
    if (typeof entry.durationMs === "number" && entry.durationMs >= 0) {
      bucket.durations.push(entry.durationMs);
    }
    if (typeof entry.bytes === "number" && entry.bytes > 0) {
      bucket.sizes.push(entry.bytes);
    }

    buckets.set(key, bucket);
  }

  const findings: AnomalyFinding[] = [];

  for (const bucket of buckets.values()) {
    // error-rate anomaly
    if (bucket.total >= config.minRequestsForErrorRate) {
      const ratio = bucket.errors / bucket.total;
      if (ratio >= config.errorRateThreshold) {
        findings.push({
          kind: "error-rate",
          severity: ratio >= 0.8 ? "error" : "warning",
          method: bucket.method,
          url: bucket.url,
          detail: `${String(Math.round(ratio * 100))}% errors (${String(bucket.errors)}/${String(bucket.total)} requests).`
        });
      }
    }

    // latency outlier
    if (bucket.durations.length >= config.minSamplesForOutlier) {
      const outlier = maxModifiedZ(bucket.durations);
      if (
        outlier &&
        outlier.score >= config.outlierZThreshold &&
        outlier.value >= config.latencyFloorMs
      ) {
        findings.push({
          kind: "latency-outlier",
          severity: "warning",
          method: bucket.method,
          url: bucket.url,
          detail: `Latency spike: ${String(Math.round(outlier.value))} ms vs ~${String(Math.round(outlier.median))} ms typical.`
        });
      }
    }

    // payload outlier
    if (bucket.sizes.length >= config.minSamplesForOutlier) {
      const outlier = maxModifiedZ(bucket.sizes);
      if (
        outlier &&
        outlier.score >= config.outlierZThreshold &&
        outlier.value >= config.payloadFloorBytes
      ) {
        findings.push({
          kind: "payload-outlier",
          severity: "info",
          method: bucket.method,
          url: bucket.url,
          detail: `Payload spike: ${String(Math.round(outlier.value))} bytes vs ~${String(Math.round(outlier.median))} bytes typical.`
        });
      }
    }
  }

  const severityRank: Record<AnomalySeverity, number> = { error: 0, warning: 1, info: 2 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    findings,
    analyzedRequests: entries.length,
    analyzedEndpoints: buckets.size
  };
};
