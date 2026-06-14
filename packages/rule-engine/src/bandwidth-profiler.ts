/**
 * Bandwidth profiler (PERF-003).
 *
 * Aggregates captured traffic to estimate how response payload bytes and time
 * are distributed across endpoints. It answers "which endpoints consume the
 * most bandwidth?" and "what is their effective throughput?".
 *
 * Throughput is only computed from honest signals: the response payload size
 * (bytes we actually have) divided by the measured duration. When the download
 * phase (PERF-002) is known, it is preferred over total duration for a more
 * accurate transfer-rate estimate. Entries without a known size contribute to
 * counts but not to byte totals.
 *
 * Pure functions only — no chrome API, no DOM. Fully testable.
 */

export type BandwidthEntry = {
  method: string;
  url: string;
  /** Response payload size in bytes (0 when unknown/empty). */
  bytes: number;
  /** Total request duration in ms. */
  durationMs?: number;
  /** Transfer phase in ms (PERF-002), preferred for throughput when present. */
  downloadMs?: number;
};

export type BandwidthEndpointProfile = {
  method: string;
  url: string;
  requestCount: number;
  totalBytes: number;
  averageBytes: number;
  /** Effective throughput in bytes/second, or null when not measurable. */
  throughputBytesPerSec: number | null;
  /** Share of total captured bytes, 0..1. */
  byteShare: number;
};

export type BandwidthReport = {
  endpoints: BandwidthEndpointProfile[];
  totalBytes: number;
  totalRequests: number;
  /** Endpoints with a known byte size (contributing to totals). */
  measuredRequests: number;
};

const keyOf = (entry: { method: string; url: string }): string =>
  `${entry.method.toUpperCase()} ${entry.url}`;

type Accumulator = {
  method: string;
  url: string;
  requestCount: number;
  totalBytes: number;
  totalTransferMs: number;
  hasTransferTime: boolean;
};

/**
 * Builds a per-endpoint bandwidth profile, sorted by descending total bytes.
 *
 * Throughput uses the summed download phase when available for the endpoint,
 * otherwise the summed total duration. It is null when no time was measured or
 * the endpoint transferred zero bytes.
 */
export const profileBandwidth = (entries: BandwidthEntry[]): BandwidthReport => {
  const buckets = new Map<string, Accumulator>();
  let totalBytes = 0;
  let measuredRequests = 0;

  for (const entry of entries) {
    const key = keyOf(entry);
    const bucket = buckets.get(key) ?? {
      method: entry.method,
      url: entry.url,
      requestCount: 0,
      totalBytes: 0,
      totalTransferMs: 0,
      hasTransferTime: false
    };

    bucket.requestCount += 1;

    const bytes = typeof entry.bytes === "number" && entry.bytes > 0 ? entry.bytes : 0;
    bucket.totalBytes += bytes;
    totalBytes += bytes;

    if (bytes > 0) {
      measuredRequests += 1;
    }

    const transferMs =
      typeof entry.downloadMs === "number"
        ? entry.downloadMs
        : typeof entry.durationMs === "number"
          ? entry.durationMs
          : null;

    if (transferMs !== null && transferMs > 0) {
      bucket.totalTransferMs += transferMs;
      bucket.hasTransferTime = true;
    }

    buckets.set(key, bucket);
  }

  const endpoints: BandwidthEndpointProfile[] = Array.from(buckets.values())
    .map((bucket) => {
      const throughputBytesPerSec =
        bucket.hasTransferTime && bucket.totalTransferMs > 0 && bucket.totalBytes > 0
          ? Math.round((bucket.totalBytes / bucket.totalTransferMs) * 1000)
          : null;

      return {
        method: bucket.method,
        url: bucket.url,
        requestCount: bucket.requestCount,
        totalBytes: bucket.totalBytes,
        averageBytes:
          bucket.requestCount > 0 ? Math.round(bucket.totalBytes / bucket.requestCount) : 0,
        throughputBytesPerSec,
        byteShare: totalBytes > 0 ? bucket.totalBytes / totalBytes : 0
      };
    })
    .sort((a, b) => b.totalBytes - a.totalBytes);

  return {
    endpoints,
    totalBytes,
    totalRequests: entries.length,
    measuredRequests
  };
};
