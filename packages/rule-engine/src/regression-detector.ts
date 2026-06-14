/**
 * Traffic regression detector (OBS-006 / OBS-007).
 *
 * Compares a captured baseline against a current traffic snapshot and reports
 * regressions: removed/added endpoints, status-code changes, and structural
 * contract drift in response bodies (reusing the contract comparator).
 *
 * Pure functions only — no chrome API, no DOM. Fully testable.
 */

import { compareContractStrings } from "./contract-comparator.js";

export type TrafficSnapshotEntry = {
  method: string;
  url: string;
  status?: number;
  body?: string;
};

export type RegressionKind =
  | "missing-endpoint" // present in baseline, absent now
  | "new-endpoint" // absent in baseline, present now
  | "status-change" // same endpoint, different status code
  | "contract-change"; // same endpoint, structural body drift

export type RegressionSeverity = "error" | "warning" | "info";

export type RegressionFinding = {
  kind: RegressionKind;
  severity: RegressionSeverity;
  method: string;
  url: string;
  detail: string;
};

export type RegressionReport = {
  findings: RegressionFinding[];
  comparedEndpoints: number;
  baselineEndpoints: number;
  currentEndpoints: number;
  hasErrors: boolean;
  hasWarnings: boolean;
};

const keyOf = (entry: { method: string; url: string }): string =>
  `${entry.method.toUpperCase()} ${entry.url}`;

/**
 * De-duplicates a snapshot by `METHOD url`, keeping the last occurrence
 * (most recent observed response for that endpoint).
 */
const indexByEndpoint = (entries: TrafficSnapshotEntry[]): Map<string, TrafficSnapshotEntry> => {
  const map = new Map<string, TrafficSnapshotEntry>();
  for (const entry of entries) {
    map.set(keyOf(entry), entry);
  }
  return map;
};

const statusClass = (status: number | undefined): string => {
  if (status === undefined) return "pending";
  if (status >= 500) return "5xx";
  if (status >= 400) return "4xx";
  if (status >= 300) return "3xx";
  if (status >= 200) return "2xx";
  return "1xx";
};

export const detectRegressions = (
  baseline: TrafficSnapshotEntry[],
  current: TrafficSnapshotEntry[]
): RegressionReport => {
  const baseIndex = indexByEndpoint(baseline);
  const currIndex = indexByEndpoint(current);
  const findings: RegressionFinding[] = [];
  let comparedEndpoints = 0;

  for (const [key, baseEntry] of baseIndex) {
    const currEntry = currIndex.get(key);

    if (!currEntry) {
      findings.push({
        kind: "missing-endpoint",
        severity: "warning",
        method: baseEntry.method,
        url: baseEntry.url,
        detail: "Endpoint present in baseline was not observed in the current session."
      });
      continue;
    }

    comparedEndpoints++;

    // Status-code change
    if (baseEntry.status !== currEntry.status) {
      const baseClass = statusClass(baseEntry.status);
      const currClass = statusClass(currEntry.status);
      const becameError = currClass === "4xx" || currClass === "5xx";
      const wasOk = baseClass === "2xx";
      findings.push({
        kind: "status-change",
        severity: wasOk && becameError ? "error" : "warning",
        method: baseEntry.method,
        url: baseEntry.url,
        detail: `Status changed: ${String(baseEntry.status ?? "none")} → ${String(currEntry.status ?? "none")}.`
      });
    }

    // Structural contract drift
    if (baseEntry.body && currEntry.body) {
      const comparison = compareContractStrings(baseEntry.body, currEntry.body);

      if (!comparison.match) {
        const summary = comparison.diffs
          .map((d) => `${d.path} (${d.type}: ${d.expected} → ${d.actual})`)
          .join("; ");
        const breaking = comparison.diffs.some(
          (d) => d.type === "missing-key" || d.type === "type-change"
        );
        findings.push({
          kind: "contract-change",
          severity: breaking ? "error" : "info",
          method: baseEntry.method,
          url: baseEntry.url,
          detail: summary
        });
      }
    }
  }

  for (const [key, currEntry] of currIndex) {
    if (!baseIndex.has(key)) {
      findings.push({
        kind: "new-endpoint",
        severity: "info",
        method: currEntry.method,
        url: currEntry.url,
        detail: "Endpoint observed in the current session was not in the baseline."
      });
    }
  }

  return {
    findings,
    comparedEndpoints,
    baselineEndpoints: baseIndex.size,
    currentEndpoints: currIndex.size,
    hasErrors: findings.some((f) => f.severity === "error"),
    hasWarnings: findings.some((f) => f.severity === "warning")
  };
};
