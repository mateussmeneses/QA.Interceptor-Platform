/**
 * Network inspector feature module.
 * Manages the network requests table, detail panel, compose form, and HAR import/export.
 */

import type { AppState, RequestRow, NetworkStatusFilter } from "../shared/types";
import { isNetworkStatusFilter } from "../shared/types";
import {
  escapeHtml,
  formatTimestamp,
  formatDuration,
  formatDateSlug,
  triggerDownload,
  getStatusToneClass,
  getTimelineWidthPercent,
  renderRuleChips,
  buildHar,
  readHarAsRequestRows,
  buildCurlCommand,
  summarizeRuleAction,
  byteLength,
  formatBytes,
  formatThroughput
} from "../shared/utils";
import { createModalController, type ModalController } from "../shared/modal-controller";
import { saveCapturedRequests } from "../../storage/index";
import {
  evaluateAssertions,
  type AssertionResult
} from "../../../../packages/rule-engine/src/assertion-evaluator";
import { diffText, normalizeDiffText } from "../../../../packages/rule-engine/src/diff-engine";
import {
  detectConflicts,
  type ConflictSeverity
} from "../../../../packages/rule-engine/src/conflict-detector";
import { compareContractStrings } from "../../../../packages/rule-engine/src/contract-comparator";
import { inferSchemaFromString } from "../../../../packages/rule-engine/src/schema-inference";
import {
  detectBottlenecks,
  type BottleneckFinding
} from "../../../../packages/rule-engine/src/bottleneck-detector";
import { profileBandwidth } from "../../../../packages/rule-engine/src/bandwidth-profiler";
import {
  detectAnomalies,
  type AnomalySeverity
} from "../../../../packages/rule-engine/src/anomaly-detector";

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

let networkRequestListEl: HTMLElement;
let bandwidthSummaryEl: HTMLElement;
let bandwidthListEl: HTMLElement;
let anomalySummaryEl: HTMLElement;
let anomalyListEl: HTMLElement;
let networkSearchEl: HTMLInputElement;
let networkMethodFilterEl: HTMLSelectElement;
let networkStatusFilterEl: HTMLSelectElement;
let networkDetailEmptyEl: HTMLElement;
let networkDetailContentEl: HTMLElement;
let networkDetailMethodEl: HTMLElement;
let networkDetailUrlEl: HTMLElement;
let networkDetailIdEl: HTMLElement;
let networkDetailTimeEl: HTMLElement;
let networkDetailStatusEl: HTMLElement;
let networkDetailDurationEl: HTMLElement;
let networkDetailSourceEl: HTMLElement;
let networkDetailResourceEl: HTMLElement;
let networkDetailTabEl: HTMLElement;
let networkDetailReqSizeEl: HTMLElement;
let networkDetailResSizeEl: HTMLElement;
let networkDetailRulesEl: HTMLElement;
let networkTimelineBarEl: HTMLElement;
let networkTimelineCaptionEl: HTMLElement;
let networkPhaseWaitingEl: HTMLElement;
let networkPhaseDownloadEl: HTMLElement;
let networkBottleneckNoteEl: HTMLElement;
let networkDetailBodySectionEl: HTMLElement;
let networkDetailBodyEl: HTMLElement;
let networkInferSchemaButtonEl: HTMLButtonElement | null = null;
let networkInferredSchemaEl: HTMLElement | null = null;
let networkExecutionLogEl: HTMLElement;
let networkCloneRequestButtonEl: HTMLButtonElement;
let networkEditResendButtonEl: HTMLButtonElement;
let networkRepeatRequestButtonEl: HTMLButtonElement;
let networkCopyCurlButtonEl: HTMLButtonElement;
let networkClearButtonEl: HTMLButtonElement;
let networkComposeButtonEl: HTMLButtonElement;
let networkComposePanelEl: HTMLElement;
let networkComposeDialogEl: HTMLElement;
let networkComposeMethodEl: HTMLSelectElement;
let networkComposeUrlEl: HTMLInputElement;
let networkComposeHeadersEl: HTMLTextAreaElement;
let networkComposeBodyEl: HTMLTextAreaElement;
let networkComposeSendButtonEl: HTMLButtonElement;
let networkComposeCloseButtonEl: HTMLButtonElement;
let networkComposeStatusEl: HTMLElement;
let networkImportHarButtonEl: HTMLButtonElement;
let networkImportHarInputEl: HTMLInputElement;
let networkExportHarButtonEl: HTMLButtonElement;
let networkAssertionResultsEl: HTMLElement | null = null;
// OBS-001: Diff elements
let networkDiffPinButtonEl: HTMLButtonElement | null = null;
let networkDiffCompareButtonEl: HTMLButtonElement | null = null;
let networkDiffClearButtonEl: HTMLButtonElement | null = null;
let networkDiffPinRowEl: HTMLElement | null = null;
let networkDiffPinLabelEl: HTMLElement | null = null;
let networkDiffHintEl: HTMLElement | null = null;
let networkDiffResultEl: HTMLElement | null = null;
let networkDiffStatsEl: HTMLElement | null = null;
let networkDiffLeftEl: HTMLElement | null = null;
let networkDiffRightEl: HTMLElement | null = null;
let networkDiffContractListEl: HTMLElement | null = null;
let networkComposeModalController: ModalController;

// ---------------------------------------------------------------------------
// Assertion result rendering (QP-001)
// ---------------------------------------------------------------------------

const renderAssertionResults = (results: AssertionResult[]): void => {
  if (!networkAssertionResultsEl) {
    return;
  }

  if (results.length === 0) {
    networkAssertionResultsEl.innerHTML =
      '<li class="placeholder">No enabled assertions to evaluate.</li>';
    return;
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  networkAssertionResultsEl.innerHTML = results
    .map((result) => {
      const tone = result.passed ? "ok" : result.error ? "error" : "client";
      const icon = result.passed ? "✓" : result.error ? "⚠" : "✗";
      const typeLabel = `${result.type}${result.path ? ` (${escapeHtml(result.path)})` : ""}`;
      const actualText =
        result.actual !== undefined ? ` → actual: ${escapeHtml(String(result.actual))}` : "";
      const errorText = result.error ? ` — ${escapeHtml(result.error)}` : "";

      return `<li class="assertion-result-item ${tone}">
        <span class="assertion-result-icon">${icon}</span>
        <div class="assertion-result-body">
          <strong>${escapeHtml(typeLabel)}</strong>
          <small>expected: ${escapeHtml(String(result.expected))}${actualText}${errorText}</small>
        </div>
      </li>`;
    })
    .join("");

  const summaryEl = document.getElementById("network-assertion-summary");

  if (summaryEl) {
    summaryEl.textContent = `${passedCount} passed · ${failedCount} failed`;
    summaryEl.className = `assertion-summary ${failedCount > 0 ? "fail" : "ok"}`;
  }
};

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

let _state: AppState = {
  requests: [],
  rules: [],
  ruleGroups: [],
  validation: null,
  assertions: [],
  conditionalMocks: []
};
let selectedNetworkRequestId: string | null = null;
let networkSearchQuery = "";
let networkMethodFilter = "all";
let networkStatusFilter: NetworkStatusFilter = "all";
// OBS-001: Pinned request for diff
let pinnedRequestId: string | null = null;
// PERF-001: bottleneck findings for the currently visible traffic, keyed by request id.
let bottleneckFindings = new Map<string, BottleneckFinding>();

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initNetwork(): void {
  const getEl = (id: string): HTMLElement => {
    const el = document.getElementById(id);

    if (!el) {
      throw new Error(`Network feature: missing element #${id}`);
    }

    return el;
  };

  networkRequestListEl = getEl("network-request-list");
  bandwidthSummaryEl = getEl("bandwidth-summary");
  bandwidthListEl = getEl("bandwidth-list");
  anomalySummaryEl = getEl("anomaly-summary");
  anomalyListEl = getEl("anomaly-list");
  networkSearchEl = getEl("network-search") as HTMLInputElement;
  networkMethodFilterEl = getEl("network-method-filter") as HTMLSelectElement;
  networkStatusFilterEl = getEl("network-status-filter") as HTMLSelectElement;
  networkDetailEmptyEl = getEl("network-detail-empty");
  networkDetailContentEl = getEl("network-detail-content");
  networkDetailMethodEl = getEl("network-detail-method");
  networkDetailUrlEl = getEl("network-detail-url");
  networkDetailIdEl = getEl("network-detail-id");
  networkDetailTimeEl = getEl("network-detail-time");
  networkDetailStatusEl = getEl("network-detail-status");
  networkDetailDurationEl = getEl("network-detail-duration");
  networkDetailSourceEl = getEl("network-detail-source");
  networkDetailResourceEl = getEl("network-detail-resource");
  networkDetailTabEl = getEl("network-detail-tab");
  networkDetailReqSizeEl = getEl("network-detail-req-size");
  networkDetailResSizeEl = getEl("network-detail-res-size");
  networkDetailRulesEl = getEl("network-detail-rules");
  networkTimelineBarEl = getEl("network-timeline-bar");
  networkTimelineCaptionEl = getEl("network-timeline-caption");
  networkPhaseWaitingEl = getEl("network-phase-waiting");
  networkPhaseDownloadEl = getEl("network-phase-download");
  networkBottleneckNoteEl = getEl("network-bottleneck-note");
  networkDetailBodySectionEl = getEl("network-detail-body-section");
  networkDetailBodyEl = getEl("network-detail-body");
  networkInferSchemaButtonEl = document.getElementById(
    "network-infer-schema-button"
  ) as HTMLButtonElement | null;
  networkInferredSchemaEl = document.getElementById("network-inferred-schema");
  networkExecutionLogEl = getEl("network-execution-log");
  networkCloneRequestButtonEl = getEl("network-clone-request-button") as HTMLButtonElement;
  networkEditResendButtonEl = getEl("network-edit-resend-button") as HTMLButtonElement;
  networkRepeatRequestButtonEl = getEl("network-repeat-request-button") as HTMLButtonElement;
  networkCopyCurlButtonEl = getEl("network-copy-curl-button") as HTMLButtonElement;
  networkClearButtonEl = getEl("network-clear-button") as HTMLButtonElement;
  networkComposeButtonEl = getEl("network-compose-button") as HTMLButtonElement;
  networkComposePanelEl = getEl("network-compose-panel");
  networkComposeDialogEl = getEl("network-compose-dialog");
  networkComposeMethodEl = getEl("network-compose-method") as HTMLSelectElement;
  networkComposeUrlEl = getEl("network-compose-url") as HTMLInputElement;
  networkComposeHeadersEl = getEl("network-compose-headers") as HTMLTextAreaElement;
  networkComposeBodyEl = getEl("network-compose-body") as HTMLTextAreaElement;
  networkComposeSendButtonEl = getEl("network-compose-send-button") as HTMLButtonElement;
  networkComposeCloseButtonEl = getEl("network-compose-close-button") as HTMLButtonElement;
  networkComposeStatusEl = getEl("network-compose-status");
  networkImportHarButtonEl = getEl("network-import-har-button") as HTMLButtonElement;
  networkImportHarInputEl = getEl("network-import-har-input") as HTMLInputElement;
  networkExportHarButtonEl = getEl("network-export-har-button") as HTMLButtonElement;
  networkAssertionResultsEl = document.getElementById("network-assertion-results");
  // OBS-001: Diff elements (optional — degrade gracefully)
  networkDiffPinButtonEl = document.getElementById(
    "network-diff-pin-button"
  ) as HTMLButtonElement | null;
  networkDiffCompareButtonEl = document.getElementById(
    "network-diff-compare-button"
  ) as HTMLButtonElement | null;
  networkDiffClearButtonEl = document.getElementById(
    "network-diff-clear-button"
  ) as HTMLButtonElement | null;
  networkDiffPinRowEl = document.getElementById("network-diff-pin-row");
  networkDiffPinLabelEl = document.getElementById("network-diff-pin-label");
  networkDiffHintEl = document.getElementById("network-diff-hint");
  networkDiffResultEl = document.getElementById("network-diff-result");
  networkDiffStatsEl = document.getElementById("network-diff-stats");
  networkDiffLeftEl = document.getElementById("network-diff-left");
  networkDiffRightEl = document.getElementById("network-diff-right");
  networkDiffContractListEl = document.getElementById("network-diff-contract-list");

  networkComposeModalController = createModalController({
    panelEl: networkComposePanelEl,
    dialogEl: networkComposeDialogEl,
    onRequestClose: () => {
      closeComposePanel();
    },
    initialFocusEl: () => networkComposeUrlEl,
    defaultRestoreFocusEl: () => networkComposeButtonEl
  });

  bindEvents();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderNetwork(state: AppState): void {
  _state = state;
  renderNetworkInspector(state.requests);
}

// PERF-003: aggregate response payload bytes per endpoint and surface the
// heaviest consumers with their effective throughput (download-rate honest).
const renderBandwidthProfile = (rows: RequestRow[]): void => {
  const report = profileBandwidth(
    rows
      .filter((row) => Boolean(row.response))
      .map((row) => ({
        method: row.method,
        url: row.url,
        bytes: byteLength(row.response?.body),
        durationMs: row.response?.durationMs,
        downloadMs: row.response?.downloadMs
      }))
  );

  if (report.totalBytes <= 0) {
    bandwidthSummaryEl.textContent = "No response payloads captured yet.";
    bandwidthListEl.innerHTML = '<li class="placeholder">No response payloads captured yet.</li>';
    return;
  }

  bandwidthSummaryEl.textContent = `${formatBytes(report.totalBytes)} across ${String(report.measuredRequests)} response${report.measuredRequests === 1 ? "" : "s"}`;

  bandwidthListEl.innerHTML = report.endpoints
    .filter((endpoint) => endpoint.totalBytes > 0)
    .slice(0, 5)
    .map((endpoint) => {
      const sharePct = Math.round(endpoint.byteShare * 100);
      const throughput = formatThroughput(endpoint.throughputBytesPerSec);

      return (
        `<li class="bandwidth-row">` +
        `<div class="bandwidth-row-main">` +
        `<span class="status-chip">${escapeHtml(endpoint.method)}</span>` +
        `<span class="bandwidth-url" title="${escapeHtml(endpoint.url)}">${escapeHtml(endpoint.url)}</span>` +
        `<span class="bandwidth-bytes">${escapeHtml(formatBytes(endpoint.totalBytes))}</span>` +
        `</div>` +
        `<div class="bandwidth-meta">` +
        `<div class="bandwidth-bar"><span style="width:${escapeHtml(String(sharePct))}%"></span></div>` +
        `<small>${escapeHtml(String(sharePct))}% · ${escapeHtml(throughput)} · ${escapeHtml(String(endpoint.requestCount))}×</small>` +
        `</div>` +
        `</li>`
      );
    })
    .join("");
};

// OBS-008: surface in-session traffic anomalies (error spikes, latency/payload
// outliers) computed with robust statistics over the visible traffic.
const renderAnomalies = (rows: RequestRow[]): void => {
  const report = detectAnomalies(
    rows
      .filter((row) => Boolean(row.response))
      .map((row) => ({
        method: row.method,
        url: row.url,
        status: row.response?.status,
        durationMs: row.response?.durationMs,
        bytes: byteLength(row.response?.body)
      }))
  );

  if (report.findings.length === 0) {
    anomalySummaryEl.textContent =
      report.analyzedRequests > 0
        ? `No anomalies across ${String(report.analyzedEndpoints)} endpoint${report.analyzedEndpoints === 1 ? "" : "s"}.`
        : "No traffic captured yet.";
    anomalyListEl.innerHTML = '<li class="placeholder">No anomalies detected.</li>';
    return;
  }

  const errorCount = report.findings.filter((f) => f.severity === "error").length;
  anomalySummaryEl.textContent = `${String(report.findings.length)} anomal${report.findings.length === 1 ? "y" : "ies"} detected${errorCount > 0 ? ` (${String(errorCount)} critical)` : ""}.`;

  const severityLabel: Record<AnomalySeverity, string> = {
    error: "Critical",
    warning: "Warning",
    info: "Info"
  };

  anomalyListEl.innerHTML = report.findings
    .map((finding) => {
      return (
        `<li class="anomaly-row anomaly-${escapeHtml(finding.severity)}">` +
        `<div class="anomaly-row-main">` +
        `<span class="anomaly-badge">${escapeHtml(severityLabel[finding.severity])}</span>` +
        `<span class="status-chip">${escapeHtml(finding.method)}</span>` +
        `<span class="anomaly-url" title="${escapeHtml(finding.url)}">${escapeHtml(finding.url)}</span>` +
        `</div>` +
        `<small>${escapeHtml(finding.detail)}</small>` +
        `</li>`
      );
    })
    .join("");
};

const renderNetworkInspector = (rows: RequestRow[]): void => {
  const filteredRows = applyNetworkFilters(rows);

  // PERF-003: bandwidth profile across the currently visible traffic.
  renderBandwidthProfile(filteredRows);

  // OBS-008: in-session anomaly detection across the currently visible traffic.
  renderAnomalies(filteredRows);

  if (filteredRows.length > 0) {
    const hasSelection = selectedNetworkRequestId
      ? filteredRows.some((row) => row.id === selectedNetworkRequestId)
      : false;

    if (!hasSelection) {
      selectedNetworkRequestId = filteredRows[0].id;
    }
  } else {
    selectedNetworkRequestId = null;
  }

  if (filteredRows.length === 0) {
    networkRequestListEl.innerHTML =
      '<li class="placeholder">No requests match current filters.</li>';
    renderNetworkDetail(null);
    return;
  }

  const maxVisibleDuration = Math.max(
    1,
    ...filteredRows.map((row) => row.response?.durationMs ?? 0)
  );

  // PERF-001: flag bottleneck requests across the currently visible traffic.
  bottleneckFindings = new Map(
    detectBottlenecks(
      filteredRows
        .filter((row) => typeof row.response?.durationMs === "number")
        .map((row) => ({
          id: row.id,
          method: row.method,
          url: row.url,
          durationMs: row.response?.durationMs ?? 0,
          waitingMs: row.response?.waitingMs,
          downloadMs: row.response?.downloadMs,
          bytes: byteLength(row.response?.body)
        }))
    ).findings.map((finding) => [finding.id, finding])
  );

  networkRequestListEl.innerHTML = filteredRows
    .map((row) => {
      const isActive = selectedNetworkRequestId === row.id;
      const statusValue = row.response ? String(row.response.status) : "Pending";
      const durationLabel = row.response ? formatDuration(row.response.durationMs) : "-";

      // OBS-002: waterfall scaled to the slowest request in the current view.
      const durationMs = row.response?.durationMs ?? 0;
      const widthPct =
        maxVisibleDuration > 0 ? Math.round((durationMs / maxVisibleDuration) * 100) : 0;
      const barWidth = durationMs > 0 ? Math.max(2, widthPct) : 0;
      const tone = getStatusToneClass(row.response?.status);
      const resBytes = byteLength(row.response?.body);
      const sizeLabel = resBytes > 0 ? ` · ${formatBytes(resBytes)}` : "";
      // PERF-001: slow-request badge for the row.
      const bottleneck = bottleneckFindings.get(row.id);
      const bottleneckBadge = bottleneck
        ? `<span class="bottleneck-badge" title="${escapeHtml(bottleneck.detail)}">slow</span>`
        : "";

      return `<li class="network-row${isActive ? " active" : ""}" data-network-request-id="${escapeHtml(row.id)}"><div class="network-row-main"><span class="status-chip">${escapeHtml(row.method)}</span><span class="network-row-url" title="${escapeHtml(row.url)}">${escapeHtml(row.url)}</span>${bottleneckBadge}<span class="status-chip ${escapeHtml(tone)}">${escapeHtml(statusValue)}</span><span class="network-row-time">${escapeHtml(durationLabel)}${escapeHtml(sizeLabel)}</span></div><div class="network-waterfall" title="${escapeHtml(durationLabel)}"><span class="wf-${escapeHtml(tone)}" style="width:${escapeHtml(String(barWidth))}%"></span></div></li>`;
    })
    .join("");

  const selectedRow = filteredRows.find((row) => row.id === selectedNetworkRequestId) ?? null;
  renderNetworkDetail(selectedRow);
};

const renderNetworkDetail = (row: RequestRow | null): void => {
  if (!row) {
    networkDetailEmptyEl.classList.remove("hidden");
    networkDetailContentEl.classList.add("hidden");
    networkExecutionLogEl.innerHTML =
      '<li class="placeholder">Select a request to inspect execution timeline.</li>';
    return;
  }

  networkDetailEmptyEl.classList.add("hidden");
  networkDetailContentEl.classList.remove("hidden");

  networkDetailMethodEl.textContent = row.method;
  networkDetailUrlEl.textContent = row.url;
  networkDetailIdEl.textContent = row.id;
  networkDetailTimeEl.textContent = formatTimestamp(row.timestamp);
  networkDetailStatusEl.textContent = row.response ? String(row.response.status) : "Pending";
  networkDetailDurationEl.textContent = row.response
    ? formatDuration(row.response.durationMs)
    : "Waiting";
  networkDetailSourceEl.textContent = row.captureSource ?? "network";
  networkDetailResourceEl.textContent = row.resourceType ?? "unknown";
  networkDetailTabEl.textContent =
    typeof row.tabId === "number" && row.tabId >= 0 ? String(row.tabId) : "n/a";

  // OBS-003: request/response payload size analysis
  const reqBytes = byteLength(row.body);
  const resBytes = byteLength(row.response?.body);
  networkDetailReqSizeEl.textContent = row.body ? formatBytes(reqBytes) : "—";
  networkDetailResSizeEl.textContent = row.response?.body ? formatBytes(resBytes) : "—";

  networkDetailStatusEl.className = `status-chip ${getStatusToneClass(row.response?.status)}`;
  networkDetailMethodEl.className = "status-chip";

  networkDetailRulesEl.innerHTML = renderRuleChips(row.matchedRules);
  networkExecutionLogEl.innerHTML = renderNetworkExecutionTimeline(row);
  networkTimelineBarEl.style.width = `${String(getTimelineWidthPercent(row.response?.durationMs))}%`;
  networkTimelineCaptionEl.textContent = row.response
    ? `Response completed in ${formatDuration(row.response.durationMs)}.`
    : "No response timing yet.";

  // PERF-002: honest two-phase breakdown (waiting = time-to-first-byte,
  // download = transfer time) when webRequest exposed the first-byte signal.
  renderTimingPhases(row);

  // PERF-001: surface the bottleneck classification for the selected request.
  const bottleneck = bottleneckFindings.get(row.id);
  if (bottleneck) {
    networkBottleneckNoteEl.textContent = `Bottleneck (${bottleneck.reason}): ${bottleneck.detail}`;
    networkBottleneckNoteEl.classList.remove("hidden");
  } else {
    networkBottleneckNoteEl.textContent = "";
    networkBottleneckNoteEl.classList.add("hidden");
  }

  const body = row.response?.body;

  if (body) {
    networkDetailBodySectionEl.classList.remove("hidden");
    networkDetailBodyEl.textContent = body;
  } else {
    networkDetailBodySectionEl.classList.add("hidden");
    networkDetailBodyEl.textContent = "";
  }

  // INT-006: reset any previously inferred schema when switching requests
  if (networkInferredSchemaEl) {
    networkInferredSchemaEl.textContent = "";
    networkInferredSchemaEl.classList.add("hidden");
  }

  // Auto-evaluate assertions against the selected response (QP-001)
  if (row.response) {
    const responseContext = {
      status: row.response.status,
      headers: row.response.headers ?? {},
      body: row.response.body
    };
    const results = evaluateAssertions(
      _state.assertions.map((a) => ({
        id: a.id,
        type: a.type,
        enabled: a.enabled,
        expected: a.expected as string | number,
        path: a.path
      })),
      responseContext
    );
    renderAssertionResults(results);
  } else {
    renderAssertionResults([]);
  }
};

const conflictSeverityIcon = (severity: ConflictSeverity): string =>
  severity === "error" ? "⛔" : severity === "warning" ? "⚠" : "ℹ";

// INT-002: render structural contract comparison between two response bodies.
const renderContractDiff = (expectedBody: string, actualBody: string): string => {
  if (!expectedBody.trim() || !actualBody.trim()) {
    return `<li class="placeholder">No response bodies to compare for contract changes.</li>`;
  }

  const comparison = compareContractStrings(expectedBody, actualBody);

  if (comparison.match) {
    return `<li class="contract-ok">✓ No structural contract changes detected.</li>`;
  }

  const labels: Record<string, string> = {
    "missing-key": "Missing key",
    "extra-key": "Extra key",
    "type-change": "Type change",
    "null-change": "Null change"
  };

  return comparison.diffs
    .map((diff) => {
      const label = labels[diff.type] ?? diff.type;
      return (
        `<li class="contract-diff ${escapeHtml(diff.type)}">` +
        `<span class="contract-diff-kind">${escapeHtml(label)}</span>` +
        `<code class="contract-diff-path">${escapeHtml(diff.path)}</code>` +
        `<small>expected ${escapeHtml(diff.expected)} → actual ${escapeHtml(diff.actual)}</small>` +
        `</li>`
      );
    })
    .join("");
};

const renderTimingPhases = (row: RequestRow): void => {
  const waitingMs = row.response?.waitingMs;
  const downloadMs = row.response?.downloadMs;
  const hasBreakdown = typeof waitingMs === "number" && typeof downloadMs === "number";

  if (!hasBreakdown) {
    networkPhaseWaitingEl.style.width = "0%";
    networkPhaseDownloadEl.style.width = "0%";
    networkPhaseWaitingEl.title = "";
    networkPhaseDownloadEl.title = "";
    return;
  }

  const total = waitingMs + downloadMs;
  const waitingPct = total > 0 ? Math.round((waitingMs / total) * 100) : 0;
  const downloadPct = total > 0 ? 100 - waitingPct : 0;

  networkPhaseWaitingEl.style.width = `${String(waitingPct)}%`;
  networkPhaseDownloadEl.style.width = `${String(downloadPct)}%`;
  networkPhaseWaitingEl.title = `Waiting (TTFB): ${formatDuration(waitingMs)}`;
  networkPhaseDownloadEl.title = `Download: ${formatDuration(downloadMs)}`;
  networkTimelineCaptionEl.textContent = `Waiting ${formatDuration(waitingMs)} · Download ${formatDuration(downloadMs)}`;
};

const renderNetworkExecutionTimeline = (row: RequestRow): string => {
  // OBS-004 / INT-003: detect rule conflicts using the rule-engine conflict detector.
  // Only conflicts among rules that actually matched THIS request are surfaced.
  const matchedRuleIds = new Set(row.matchedRules.map((m) => m.ruleId));
  const conflictReport = detectConflicts(_state.rules);
  const relevantConflicts = conflictReport.conflicts.filter(
    (c) => matchedRuleIds.has(c.ruleIds[0]) && matchedRuleIds.has(c.ruleIds[1])
  );
  const conflictingRuleIds = new Set(relevantConflicts.flatMap((c) => c.ruleIds));
  const hasConflicts = relevantConflicts.length > 0;

  const parts: string[] = [];

  // Entry: request captured
  parts.push(
    `<li class="network-execution-item capture">` +
      `<span class="exec-badge capture">CAPTURE</span>` +
      `<div class="exec-body"><strong>${escapeHtml(`${row.method} request captured`)}</strong>` +
      `<small>${escapeHtml(row.url)}</small>` +
      `<small class="exec-time">${escapeHtml(formatTimestamp(row.timestamp))}</small></div></li>`
  );

  // Entries: matched rules
  for (let i = 0; i < row.matchedRules.length; i++) {
    const matched = row.matchedRules[i];

    if (!matched) {
      continue;
    }

    const isConflicting = conflictingRuleIds.has(matched.ruleId);
    const badgeClass = isConflicting ? "rule conflict" : "rule";

    const ruleConflictHints = relevantConflicts
      .filter((c) => c.ruleIds.includes(matched.ruleId))
      .map(
        (c) =>
          `<small class="exec-conflict-hint">${conflictSeverityIcon(c.severity)} ${escapeHtml(c.description)}</small>`
      )
      .join("");

    parts.push(
      `<li class="network-execution-item rule${isConflicting ? " conflict" : ""}">` +
        `<span class="exec-badge ${escapeHtml(badgeClass)}">#${String(i + 1)}</span>` +
        `<div class="exec-body">` +
        `<strong>${escapeHtml(matched.ruleName)}</strong>` +
        `<small>${escapeHtml(summarizeRuleAction(matched.type))}</small>` +
        `<small class="exec-type-pill">${escapeHtml(matched.type)}</small>` +
        ruleConflictHints +
        `</div></li>`
    );
  }

  // Conflict summary
  if (hasConflicts) {
    const summaryItems = relevantConflicts
      .map(
        (c) =>
          `<small>${conflictSeverityIcon(c.severity)} <strong>${escapeHtml(c.ruleNames[0])}</strong> ↔ <strong>${escapeHtml(c.ruleNames[1])}</strong>: ${escapeHtml(c.description)} — ${escapeHtml(c.suggestion)}</small>`
      )
      .join("");
    parts.push(
      `<li class="network-execution-item warning">` +
        `<span class="exec-badge warning">⚠</span>` +
        `<div class="exec-body"><strong>Rule conflicts detected (${String(relevantConflicts.length)})</strong>` +
        summaryItems +
        `</div></li>`
    );
  }

  // Entry: response
  if (row.response) {
    const statusTone = getStatusToneClass(row.response.status);
    parts.push(
      `<li class="network-execution-item response ${escapeHtml(statusTone)}">` +
        `<span class="exec-badge response ${escapeHtml(statusTone)}">${escapeHtml(String(row.response.status))}</span>` +
        `<div class="exec-body"><strong>${escapeHtml(`Response completed (${row.response.status})`)}</strong>` +
        `<small>${escapeHtml(`Finished in ${formatDuration(row.response.durationMs)}`)}</small>` +
        `<small class="exec-time">${escapeHtml(formatTimestamp(row.response.timestamp))}</small>` +
        `</div></li>`
    );
  } else {
    parts.push(
      `<li class="network-execution-item pending">` +
        `<span class="exec-badge pending">…</span>` +
        `<div class="exec-body"><strong>Response pending</strong>` +
        `<small>Waiting for completion from browser runtime.</small>` +
        `</div></li>`
    );
  }

  return parts.join("");
};

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const applyNetworkFilters = (rows: RequestRow[]): RequestRow[] =>
  rows
    .filter((row) => {
      if (networkMethodFilter !== "all" && row.method !== networkMethodFilter) {
        return false;
      }

      if (
        networkStatusFilter !== "all" &&
        !matchesStatusFilter(row.response?.status, networkStatusFilter)
      ) {
        return false;
      }

      if (!networkSearchQuery) {
        return true;
      }

      const rulesSummary = row.matchedRules.map((r) => r.ruleName).join(" ");
      const haystack = `${row.method} ${row.url} ${rulesSummary}`.toLowerCase();
      return haystack.includes(networkSearchQuery);
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

const matchesStatusFilter = (status: number | undefined, filter: NetworkStatusFilter): boolean => {
  if (filter === "pending") {
    return typeof status !== "number";
  }

  if (typeof status !== "number") {
    return false;
  }

  if (filter === "2xx") {
    return status >= 200 && status < 300;
  }

  if (filter === "3xx") {
    return status >= 300 && status < 400;
  }

  if (filter === "4xx") {
    return status >= 400 && status < 500;
  }

  if (filter === "5xx") {
    return status >= 500;
  }

  return true;
};

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------

const bindEvents = (): void => {
  networkSearchEl.addEventListener("input", () => {
    networkSearchQuery = networkSearchEl.value.trim().toLowerCase();
    renderNetworkInspector(_state.requests);
  });

  networkMethodFilterEl.addEventListener("change", () => {
    networkMethodFilter = networkMethodFilterEl.value;
    renderNetworkInspector(_state.requests);
  });

  networkStatusFilterEl.addEventListener("change", () => {
    const candidate = networkStatusFilterEl.value;
    networkStatusFilter = isNetworkStatusFilter(candidate) ? candidate : "all";
    renderNetworkInspector(_state.requests);
  });

  networkClearButtonEl.addEventListener("click", () => {
    selectedNetworkRequestId = null;
    void saveCapturedRequests([]);
  });

  networkRequestListEl.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const row = target?.closest("[data-network-request-id]") as HTMLElement | null;

    if (!row) {
      return;
    }

    const requestId = row.dataset.networkRequestId;

    if (!requestId) {
      return;
    }

    selectedNetworkRequestId = requestId;
    renderNetworkInspector(_state.requests);
  });

  networkRepeatRequestButtonEl.addEventListener("click", () => {
    const row = _state.requests.find((r) => r.id === selectedNetworkRequestId);

    if (!row) {
      return;
    }

    const originalLabel = networkRepeatRequestButtonEl.textContent;
    networkRepeatRequestButtonEl.textContent = "Replaying...";
    networkRepeatRequestButtonEl.disabled = true;

    void chrome.runtime
      .sendMessage({
        type: "REPEAT_REQUEST",
        payload: { method: row.method, url: row.url, headers: row.headers, body: row.body }
      })
      .then((response: { ok?: boolean } | undefined) => {
        networkRepeatRequestButtonEl.textContent = response?.ok ? "Repeated" : "Replay failed";
      })
      .catch(() => {
        networkRepeatRequestButtonEl.textContent = "Replay failed";
      })
      .finally(() => {
        setTimeout(() => {
          networkRepeatRequestButtonEl.textContent = originalLabel;
          networkRepeatRequestButtonEl.disabled = false;
        }, 1800);
      });
  });

  networkComposeButtonEl.addEventListener("click", () => {
    const shouldOpen = networkComposePanelEl.classList.contains("hidden");

    if (!shouldOpen) {
      closeComposePanel();
      return;
    }

    const selectedRow = _state.requests.find((r) => r.id === selectedNetworkRequestId);

    if (selectedRow) {
      fillComposeFromRequest(selectedRow);
    } else {
      networkComposeMethodEl.value = "GET";
      networkComposeUrlEl.value = "";
      networkComposeHeadersEl.value = "{}";
      networkComposeBodyEl.value = "";
      setNetworkComposeStatus("Compose panel ready.", "neutral");
    }

    openComposePanel();
  });

  networkCloneRequestButtonEl.addEventListener("click", () => {
    const selectedRow = _state.requests.find((r) => r.id === selectedNetworkRequestId);

    if (!selectedRow) {
      setNetworkComposeStatus("Select a request before cloning.", "error");
      return;
    }

    fillComposeFromRequest(selectedRow);
    openComposePanel();
  });

  networkEditResendButtonEl.addEventListener("click", () => {
    const selectedRow = _state.requests.find((r) => r.id === selectedNetworkRequestId);

    if (!selectedRow) {
      setNetworkComposeStatus("Select a request before editing/resending.", "error");
      return;
    }

    fillComposeFromRequest(selectedRow);
    setNetworkComposeStatus("Editing cloned request. Update fields and click Send Request.", "ok");
    openComposePanel();
  });

  // INT-006: infer a JSON Schema from the selected response body
  networkInferSchemaButtonEl?.addEventListener("click", () => {
    if (!networkInferredSchemaEl) {
      return;
    }

    const selectedRow = _state.requests.find((r) => r.id === selectedNetworkRequestId);
    const responseBody = selectedRow?.response?.body;

    if (!responseBody) {
      networkInferredSchemaEl.textContent = "No response body to infer a schema from.";
      networkInferredSchemaEl.classList.remove("hidden");
      return;
    }

    const schema = inferSchemaFromString(responseBody);

    if (!schema) {
      networkInferredSchemaEl.textContent =
        "Response body is not valid JSON — cannot infer schema.";
      networkInferredSchemaEl.classList.remove("hidden");
      return;
    }

    networkInferredSchemaEl.textContent = JSON.stringify(schema, null, 2);
    networkInferredSchemaEl.classList.remove("hidden");
  });

  networkComposeCloseButtonEl.addEventListener("click", () => {
    closeComposePanel();
  });

  networkComposeSendButtonEl.addEventListener("click", () => {
    const method = networkComposeMethodEl.value || "GET";
    const url = networkComposeUrlEl.value.trim();

    if (!url) {
      setNetworkComposeStatus("URL is required.", "error");
      return;
    }

    let headers: Record<string, string> = {};
    const headersRaw = networkComposeHeadersEl.value.trim();

    if (headersRaw) {
      try {
        const parsed = JSON.parse(headersRaw);

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setNetworkComposeStatus("Headers must be a JSON object.", "error");
          return;
        }

        headers = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)])
        );
      } catch {
        setNetworkComposeStatus("Headers JSON is invalid.", "error");
        return;
      }
    }

    const body = networkComposeBodyEl.value;
    const originalLabel = networkComposeSendButtonEl.textContent;
    networkComposeSendButtonEl.textContent = "Sending...";
    networkComposeSendButtonEl.disabled = true;

    void chrome.runtime
      .sendMessage({
        type: "REPEAT_REQUEST",
        payload: {
          method,
          url,
          ...(Object.keys(headers).length > 0 ? { headers } : {}),
          ...(body.trim() ? { body } : {})
        }
      })
      .then(
        (
          response:
            | {
                ok?: boolean;
                status?: number;
                headers?: Record<string, string>;
                body?: string;
                error?: string;
              }
            | undefined
        ) => {
          if (response?.ok) {
            const statusPart =
              typeof response.status === "number" ? ` (status ${String(response.status)})` : "";
            setNetworkComposeStatus(`Request sent successfully${statusPart}.`, "ok");
            closeComposePanel({
              statusMessage: undefined,
              focusTrigger: false
            });

            // Auto-evaluate assertions against the compose response (QP-001)
            if (typeof response.status === "number") {
              const results = evaluateAssertions(
                _state.assertions.map((a) => ({
                  id: a.id,
                  type: a.type,
                  enabled: a.enabled,
                  expected: a.expected as string | number,
                  path: a.path
                })),
                {
                  status: response.status,
                  headers: response.headers ?? {},
                  body: response.body
                }
              );
              renderAssertionResults(results);
            }
          } else {
            setNetworkComposeStatus(
              response?.error ? `Request failed: ${String(response.error)}` : "Request failed.",
              "error"
            );
          }
        }
      )
      .catch(() => {
        setNetworkComposeStatus("Request failed due to runtime error.", "error");
      })
      .finally(() => {
        networkComposeSendButtonEl.textContent = originalLabel;
        networkComposeSendButtonEl.disabled = false;
      });
  });

  networkCopyCurlButtonEl.addEventListener("click", () => {
    const row = _state.requests.find((r) => r.id === selectedNetworkRequestId);

    if (!row) {
      return;
    }

    const curl = buildCurlCommand(row);
    void navigator.clipboard.writeText(curl).then(() => {
      const original = networkCopyCurlButtonEl.textContent;
      networkCopyCurlButtonEl.textContent = "Copied!";
      setTimeout(() => {
        networkCopyCurlButtonEl.textContent = original;
      }, 1800);
    });
  });

  networkImportHarButtonEl.addEventListener("click", () => {
    networkImportHarInputEl.value = "";
    networkImportHarInputEl.click();
  });

  networkImportHarInputEl.addEventListener("change", () => {
    const file = networkImportHarInputEl.files?.[0];

    if (!file) {
      return;
    }

    void (async () => {
      const text = await file.text();
      let parsed: unknown;

      try {
        parsed = JSON.parse(text);
      } catch {
        return;
      }

      const importedRows = readHarAsRequestRows(parsed);

      if (importedRows.length === 0) {
        return;
      }

      const merged = [...importedRows, ..._state.requests]
        .slice(0, 100)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      selectedNetworkRequestId = merged[0]?.id ?? null;
      await saveCapturedRequests(merged);
    })();
  });

  networkExportHarButtonEl.addEventListener("click", () => {
    if (_state.requests.length === 0) {
      return;
    }

    triggerDownload(
      `qa-interceptor-har-${formatDateSlug()}.json`,
      JSON.stringify(buildHar(_state.requests), null, 2),
      "application/json"
    );
  });

  // OBS-001: Diff pin and compare actions
  networkDiffPinButtonEl?.addEventListener("click", () => {
    if (!selectedNetworkRequestId) {
      return;
    }

    pinnedRequestId = selectedNetworkRequestId;
    const pinned = _state.requests.find((r) => r.id === pinnedRequestId);

    if (!pinned || !networkDiffPinRowEl || !networkDiffPinLabelEl || !networkDiffHintEl) {
      return;
    }

    networkDiffHintEl.classList.add("hidden");
    networkDiffPinRowEl.classList.remove("hidden");
    networkDiffPinLabelEl.textContent = `Pinned: ${pinned.method} ${pinned.url}`;
    networkDiffResultEl?.classList.add("hidden");
    networkDiffClearButtonEl?.classList.remove("hidden");
  });

  networkDiffCompareButtonEl?.addEventListener("click", () => {
    if (!pinnedRequestId || !selectedNetworkRequestId) {
      return;
    }

    const left = _state.requests.find((r) => r.id === pinnedRequestId);
    const right = _state.requests.find((r) => r.id === selectedNetworkRequestId);

    if (!left || !right) {
      return;
    }

    const leftBody = normalizeDiffText(left.response?.body ?? "");
    const rightBody = normalizeDiffText(right.response?.body ?? "");
    const result = diffText(leftBody, rightBody);

    if (!networkDiffResultEl || !networkDiffLeftEl || !networkDiffRightEl || !networkDiffStatsEl) {
      return;
    }

    networkDiffStatsEl.textContent = result.hasChanges
      ? `+${result.addedCount} added · -${result.removedCount} removed`
      : "No differences found";

    networkDiffLeftEl.innerHTML = result.leftLines
      .map((line) => {
        if (line.lineNumber === -1) {
          return `<span class="diff-line-empty"> </span>`;
        }

        const cls = line.status === "removed" ? "diff-line-removed" : "diff-line-equal";
        return `<span class="${cls}">${escapeHtml(line.content) || " "}</span>`;
      })
      .join("");

    networkDiffRightEl.innerHTML = result.rightLines
      .map((line) => {
        if (line.lineNumber === -1) {
          return `<span class="diff-line-empty"> </span>`;
        }

        const cls = line.status === "added" ? "diff-line-added" : "diff-line-equal";
        return `<span class="${cls}">${escapeHtml(line.content) || " "}</span>`;
      })
      .join("");

    // INT-002: structural contract comparison (breaking-change detection)
    if (networkDiffContractListEl) {
      networkDiffContractListEl.innerHTML = renderContractDiff(
        left.response?.body ?? "",
        right.response?.body ?? ""
      );
    }

    networkDiffResultEl.classList.remove("hidden");
  });

  networkDiffClearButtonEl?.addEventListener("click", () => {
    pinnedRequestId = null;
    networkDiffPinRowEl?.classList.add("hidden");
    networkDiffResultEl?.classList.add("hidden");
    networkDiffClearButtonEl?.classList.add("hidden");

    if (networkDiffHintEl) {
      networkDiffHintEl.classList.remove("hidden");
    }
  });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fillComposeFromRequest = (row: RequestRow): void => {
  networkComposeMethodEl.value = row.method;
  networkComposeUrlEl.value = row.url;
  networkComposeHeadersEl.value = JSON.stringify(row.headers ?? {}, null, 2);
  networkComposeBodyEl.value = row.body ?? "";
  setNetworkComposeStatus("Compose pre-filled from selected request.", "ok");
};

const openComposePanel = (): void => {
  networkComposeButtonEl.setAttribute("aria-expanded", "true");
  networkComposeModalController.open();
};

const closeComposePanel = (options?: { statusMessage?: string; focusTrigger?: boolean }): void => {
  networkComposeButtonEl.setAttribute("aria-expanded", "false");
  networkComposeModalController.close({
    restoreFocus: options?.focusTrigger !== false
  });

  if (options?.statusMessage !== undefined) {
    setNetworkComposeStatus(options.statusMessage, "neutral");
  } else if (!options) {
    setNetworkComposeStatus("Compose panel closed.", "neutral");
  }
};

const setNetworkComposeStatus = (message: string, tone: "neutral" | "ok" | "error"): void => {
  networkComposeStatusEl.textContent = message;
  networkComposeStatusEl.classList.remove("ok", "error");

  if (tone === "ok") {
    networkComposeStatusEl.classList.add("ok");
  } else if (tone === "error") {
    networkComposeStatusEl.classList.add("error");
  }
};
