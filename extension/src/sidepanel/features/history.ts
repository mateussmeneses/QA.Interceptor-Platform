/**
 * History & Evidence feature module.
 * Manages session list, detail panel, and evidence export.
 */

import type {
  AppState,
  RequestRow,
  HistorySession,
  HistoryOutcomeFilter,
  HistorySortOrder
} from "../shared/types";
import { isHistoryOutcomeFilter } from "../shared/types";
import {
  loadReplayArtifacts,
  saveReplayArtifacts,
  type StoredReplayArtifact,
  type StoredReplayArtifactRequest
} from "../../storage/index";
import {
  escapeHtml,
  formatTimestamp,
  formatDuration,
  formatDateSlug,
  triggerDownload,
  getStatusToneClass,
  buildHistorySessions,
  computeAverageDuration,
  getUniqueMatchedRulesCount,
  buildEvidenceJson,
  buildEvidenceMarkdown
} from "../shared/utils";
import { createModalController, type ModalController } from "../shared/modal-controller";

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

let historySessionListEl: HTMLElement;
let historyEmptyStateEl: HTMLElement;
let historySearchEl: HTMLInputElement;
let historyOutcomeFilterEl: HTMLSelectElement;
let historySortEl: HTMLSelectElement;
let historyDetailEmptyEl: HTMLElement;
let historyDetailContentEl: HTMLElement;
let historyDetailTitleEl: HTMLElement;
let historyDetailSummaryEl: HTMLElement;
let historyKpiRequestsEl: HTMLElement;
let historyKpiFailuresEl: HTMLElement;
let historyKpiDurationEl: HTMLElement;
let historyKpiRulesEl: HTMLElement;
let historyTimelineListEl: HTMLElement;
let historyExportJsonButtonEl: HTMLButtonElement;
let historyExportMdButtonEl: HTMLButtonElement;
let historyExportPanelEl: HTMLElement;
let historyExportDialogEl: HTMLElement;
let historyExportFormatEl: HTMLSelectElement;
let historyExportPreviewEl: HTMLTextAreaElement;
let historyExportDownloadButtonEl: HTMLButtonElement;
let historyExportCloseButtonEl: HTMLButtonElement;
// QP-007: Replay elements
let historyReplayButtonEl: HTMLButtonElement;
let historyReplayPanelEl: HTMLElement;
let historyReplayDialogEl: HTMLElement;
let historyReplayStatusEl: HTMLElement;
let historyReplayCounterEl: HTMLElement;
let historyReplayListEl: HTMLElement;
let historyReplaySaveArtifactButtonEl: HTMLButtonElement;
let historyReplayDeleteArtifactButtonEl: HTMLButtonElement;
let historyReplayStartButtonEl: HTMLButtonElement;
let historyReplayCancelButtonEl: HTMLButtonElement;
let historyReplayCloseButtonEl: HTMLButtonElement;
let historyReplayArtifactStatusEl: HTMLElement;
let historyExportModalController: ModalController;
let historyReplayModalController: ModalController;
let activeHistoryExportTriggerEl: HTMLElement | null = null;

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
let selectedHistorySessionId: string | null = null;
let historySearchQuery = "";
let historyOutcomeFilter: HistoryOutcomeFilter = "all";
let historySortOrder: HistorySortOrder = "recent";
let historyExportFormat: EvidenceExportFormat = "json";
// QP-007: Replay state
let replayAbortController: AbortController | null = null;
let currentReplayRows: StoredReplayArtifactRequest[] = [];
let currentReplaySessionId: string | null = null;
let currentReplayArtifactId: string | null = null;

type EvidenceExportFormat = "json" | "markdown" | "html";

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initHistory(): void {
  const getEl = (id: string): HTMLElement => {
    const el = document.getElementById(id);

    if (!el) {
      throw new Error(`History feature: missing element #${id}`);
    }

    return el;
  };

  historySessionListEl = getEl("history-session-list");
  historyEmptyStateEl = getEl("history-empty-state");
  historySearchEl = getEl("history-search") as HTMLInputElement;
  historyOutcomeFilterEl = getEl("history-outcome-filter") as HTMLSelectElement;
  historySortEl = getEl("history-sort") as HTMLSelectElement;
  historyDetailEmptyEl = getEl("history-detail-empty");
  historyDetailContentEl = getEl("history-detail-content");
  historyDetailTitleEl = getEl("history-detail-title");
  historyDetailSummaryEl = getEl("history-detail-summary");
  historyKpiRequestsEl = getEl("history-kpi-requests");
  historyKpiFailuresEl = getEl("history-kpi-failures");
  historyKpiDurationEl = getEl("history-kpi-duration");
  historyKpiRulesEl = getEl("history-kpi-rules");
  historyTimelineListEl = getEl("history-timeline-list");
  historyExportJsonButtonEl = getEl("history-export-json-button") as HTMLButtonElement;
  historyExportMdButtonEl = getEl("history-export-md-button") as HTMLButtonElement;
  historyExportPanelEl = getEl("history-export-panel");
  historyExportDialogEl = getEl("history-export-dialog");
  historyExportFormatEl = getEl("history-export-format") as HTMLSelectElement;
  historyExportPreviewEl = getEl("history-export-preview") as HTMLTextAreaElement;
  historyExportDownloadButtonEl = getEl("history-export-download-button") as HTMLButtonElement;
  historyExportCloseButtonEl = getEl("history-export-close-button") as HTMLButtonElement;
  // QP-007: Replay elements
  historyReplayButtonEl = getEl("history-replay-button") as HTMLButtonElement;
  historyReplayPanelEl = getEl("history-replay-panel");
  historyReplayDialogEl = getEl("history-replay-dialog");
  historyReplayStatusEl = getEl("history-replay-status");
  historyReplayCounterEl = getEl("history-replay-counter");
  historyReplayListEl = getEl("history-replay-list");
  historyReplaySaveArtifactButtonEl = getEl(
    "history-replay-save-artifact-button"
  ) as HTMLButtonElement;
  historyReplayDeleteArtifactButtonEl = getEl(
    "history-replay-delete-artifact-button"
  ) as HTMLButtonElement;
  historyReplayStartButtonEl = getEl("history-replay-start-button") as HTMLButtonElement;
  historyReplayCancelButtonEl = getEl("history-replay-cancel-button") as HTMLButtonElement;
  historyReplayCloseButtonEl = getEl("history-replay-close-button") as HTMLButtonElement;
  historyReplayArtifactStatusEl = getEl("history-replay-artifact-status");

  historyExportModalController = createModalController({
    panelEl: historyExportPanelEl,
    dialogEl: historyExportDialogEl,
    onRequestClose: () => {
      closeExportDialog();
    },
    initialFocusEl: () => historyExportFormatEl,
    defaultRestoreFocusEl: () => historyExportJsonButtonEl
  });

  historyReplayModalController = createModalController({
    panelEl: historyReplayPanelEl,
    dialogEl: historyReplayDialogEl,
    onRequestClose: () => {
      closeReplayPanel();
    },
    initialFocusEl: () => historyReplayStartButtonEl,
    defaultRestoreFocusEl: () => historyReplayButtonEl
  });

  bindEvents();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderHistory(state: AppState): void {
  _state = state;
  renderHistoryEvidence(state.requests);
}

const renderHistoryEvidence = (rows: RequestRow[]): void => {
  const sessions = buildHistorySessions(rows);
  const filteredSessions = applyHistoryFilters(sessions);

  if (filteredSessions.length > 0) {
    const hasSelection = selectedHistorySessionId
      ? filteredSessions.some((s) => s.id === selectedHistorySessionId)
      : false;

    if (!hasSelection) {
      selectedHistorySessionId = filteredSessions[0].id;
    }
  } else {
    selectedHistorySessionId = null;
  }

  if (sessions.length === 0) {
    historySessionListEl.innerHTML = "";
    historyEmptyStateEl.textContent = "No captured sessions yet.";
    historyEmptyStateEl.classList.remove("hidden");
    renderHistoryDetail(null);
    return;
  }

  if (filteredSessions.length === 0) {
    historySessionListEl.innerHTML = "";
    historyEmptyStateEl.textContent = "No sessions match current filters.";
    historyEmptyStateEl.classList.remove("hidden");
    renderHistoryDetail(null);
    return;
  }

  historyEmptyStateEl.classList.add("hidden");
  historySessionListEl.innerHTML = filteredSessions
    .map((session) => {
      const activeClass = selectedHistorySessionId === session.id ? " active" : "";
      const requestCount = session.requests.length;

      return `<li class="history-session-card${activeClass}"><div class="history-session-top"><div><strong>${escapeHtml(session.label)}</strong><div class="mock-rule-url">${escapeHtml(formatTimestamp(session.startedAt))} - ${escapeHtml(formatTimestamp(session.endedAt))}</div></div><button type="button" class="rule-select" data-history-select="${escapeHtml(session.id)}">Inspect</button></div><div class="history-session-meta"><span class="pill muted">${escapeHtml(String(requestCount))} requests</span>${session.failedCount > 0 ? `<span class="pill muted">${escapeHtml(String(session.failedCount))} failures</span>` : ""}${session.pendingCount > 0 ? `<span class="pill muted">${escapeHtml(String(session.pendingCount))} pending</span>` : ""}</div></li>`;
    })
    .join("");

  const selectedSession = filteredSessions.find((s) => s.id === selectedHistorySessionId) ?? null;
  renderHistoryDetail(selectedSession);
};

const renderHistoryDetail = (session: HistorySession | null): void => {
  if (!session) {
    historyDetailEmptyEl.classList.remove("hidden");
    historyDetailContentEl.classList.add("hidden");
    return;
  }

  historyDetailEmptyEl.classList.add("hidden");
  historyDetailContentEl.classList.remove("hidden");

  historyDetailTitleEl.textContent = session.label;
  historyDetailSummaryEl.textContent = `${session.requests.length} requests`;
  historyKpiRequestsEl.textContent = String(session.requests.length);
  historyKpiFailuresEl.textContent = String(session.failedCount);
  historyKpiDurationEl.textContent = formatDuration(computeAverageDuration(session.requests));
  historyKpiRulesEl.textContent = String(getUniqueMatchedRulesCount(session.requests));

  historyTimelineListEl.innerHTML = session.requests
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((row) => {
      const statusLabel = row.response ? String(row.response.status) : "Pending";
      const tone = getStatusToneClass(row.response?.status);

      return `<li class="history-timeline-item"><div class="history-timeline-top"><span class="status-chip">${escapeHtml(row.method)}</span><span class="status-chip ${escapeHtml(tone)}">${escapeHtml(statusLabel)}</span></div><div class="history-timeline-url">${escapeHtml(row.url)}</div><small>${escapeHtml(formatTimestamp(row.timestamp))}${row.response ? ` · ${escapeHtml(formatDuration(row.response.durationMs))}` : ""}</small></li>`;
    })
    .join("");
};

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const applyHistoryFilters = (sessions: HistorySession[]): HistorySession[] => {
  const filtered = sessions.filter((session) => {
    if (historyOutcomeFilter !== "all" && !matchesHistoryOutcome(session, historyOutcomeFilter)) {
      return false;
    }

    if (!historySearchQuery) {
      return true;
    }

    const haystack = session.requests
      .map((r) => `${r.method} ${r.url}`)
      .join(" ")
      .toLowerCase();
    return haystack.includes(historySearchQuery);
  });

  return filtered.sort((a, b) => {
    const aTime = new Date(a.startedAt).getTime();
    const bTime = new Date(b.startedAt).getTime();
    return historySortOrder === "oldest" ? aTime - bTime : bTime - aTime;
  });
};

const matchesHistoryOutcome = (session: HistorySession, filter: HistoryOutcomeFilter): boolean => {
  if (filter === "pending") {
    return session.pendingCount > 0;
  }

  if (filter === "failed") {
    return session.failedCount > 0;
  }

  if (filter === "passed") {
    return session.failedCount === 0 && session.pendingCount === 0;
  }

  return true;
};

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------

const bindEvents = (): void => {
  historySearchEl.addEventListener("input", () => {
    historySearchQuery = historySearchEl.value.trim().toLowerCase();
    renderHistoryEvidence(_state.requests);
  });

  historyOutcomeFilterEl.addEventListener("change", () => {
    const candidate = historyOutcomeFilterEl.value;
    historyOutcomeFilter = isHistoryOutcomeFilter(candidate) ? candidate : "all";
    renderHistoryEvidence(_state.requests);
  });

  historySortEl.addEventListener("change", () => {
    historySortOrder = historySortEl.value === "oldest" ? "oldest" : "recent";
    renderHistoryEvidence(_state.requests);
  });

  historySessionListEl.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const selectButton = target?.closest("[data-history-select]") as HTMLButtonElement | null;

    if (!selectButton) {
      return;
    }

    const sessionId = selectButton.dataset.historySelect;

    if (!sessionId) {
      return;
    }

    selectedHistorySessionId = sessionId;
    renderHistoryEvidence(_state.requests);
  });

  historyExportJsonButtonEl.addEventListener("click", () => {
    openExportDialog("json", historyExportJsonButtonEl);
  });

  historyExportMdButtonEl.addEventListener("click", () => {
    openExportDialog("markdown", historyExportMdButtonEl);
  });

  historyExportFormatEl.addEventListener("change", () => {
    const candidate = historyExportFormatEl.value;

    if (candidate === "json" || candidate === "markdown" || candidate === "html") {
      historyExportFormat = candidate;
    } else {
      historyExportFormat = "json";
      historyExportFormatEl.value = "json";
    }

    const selectedSession = getSelectedHistorySession();

    if (selectedSession) {
      renderExportPreview(selectedSession, historyExportFormat);
    }
  });

  historyExportDownloadButtonEl.addEventListener("click", () => {
    const selectedSession = getSelectedHistorySession();

    if (!selectedSession) {
      return;
    }

    const exportData = buildExportData(selectedSession, historyExportFormat);
    triggerDownload(
      `qa-evidence-${formatDateSlug()}.${exportData.extension}`,
      exportData.content,
      exportData.mimeType
    );
  });

  historyExportCloseButtonEl.addEventListener("click", () => {
    closeExportDialog();
  });

  // QP-007: Show/hide replay panel
  historyReplayButtonEl.addEventListener("click", () => {
    const sessions = buildHistorySessions(_state.requests);
    const session = sessions.find((s) => s.id === selectedHistorySessionId);

    if (!session) {
      return;
    }

    historyReplayButtonEl.setAttribute("aria-expanded", "true");
    historyReplayModalController.open();
    setReplayArtifactStatus("Loading replay artifact...");
    void prepareReplayDataForSession(session);
    setReplayStatus("ready");
  });

  historyReplaySaveArtifactButtonEl.addEventListener("click", () => {
    const sessions = buildHistorySessions(_state.requests);
    const session = sessions.find((s) => s.id === selectedHistorySessionId);

    if (!session || session.requests.length === 0) {
      setReplayArtifactStatus("No requests available to save.");
      return;
    }

    void (async () => {
      const artifact = await saveReplayArtifactForSession(session);
      currentReplaySessionId = session.id;
      currentReplayArtifactId = artifact.id;
      currentReplayRows = artifact.requests;
      renderReplayList(currentReplayRows, []);
      historyReplayCounterEl.textContent = `0 / ${currentReplayRows.length}`;
      setReplayArtifactStatus(`Artifact saved at ${formatTimestamp(artifact.createdAt)}.`);
    })();
  });

  historyReplayDeleteArtifactButtonEl.addEventListener("click", () => {
    if (!currentReplayArtifactId) {
      setReplayArtifactStatus("No saved artifact selected to delete.");
      return;
    }

    const artifactIdToDelete = currentReplayArtifactId;

    void (async () => {
      const deleted = await deleteReplayArtifactById(artifactIdToDelete);

      if (!deleted) {
        setReplayArtifactStatus("Saved artifact was not found.");
        return;
      }

      currentReplayArtifactId = null;
      setReplayArtifactStatus("Artifact removed. Using live session payload.");

      const sessions = buildHistorySessions(_state.requests);
      const session = sessions.find((s) => s.id === selectedHistorySessionId);

      if (session) {
        await prepareReplayDataForSession(session);
      }
    })();
  });

  historyReplayCloseButtonEl.addEventListener("click", () => {
    closeReplayPanel();
  });

  historyReplayStartButtonEl.addEventListener("click", () => {
    if (!currentReplaySessionId || currentReplayRows.length === 0) {
      setReplayArtifactStatus("No replay artifact loaded. Save artifact first.");
      return;
    }

    setReplayArtifactStatus("Running replay from saved artifact payload.");
    void startReplay(currentReplayRows);
  });

  historyReplayCancelButtonEl.addEventListener("click", () => {
    replayAbortController?.abort();
    replayAbortController = null;
    setReplayStatus("cancelled");
    historyReplayStartButtonEl.classList.remove("hidden");
    historyReplayCancelButtonEl.classList.add("hidden");
  });
};

const closeReplayPanel = (): void => {
  replayAbortController?.abort();
  replayAbortController = null;
  currentReplayRows = [];
  currentReplaySessionId = null;
  currentReplayArtifactId = null;
  historyReplayButtonEl.setAttribute("aria-expanded", "false");
  historyReplayModalController.close();
};

const getSelectedHistorySession = (): HistorySession | null => {
  const sessions = buildHistorySessions(_state.requests);
  return sessions.find((s) => s.id === selectedHistorySessionId) ?? null;
};

const openExportDialog = (
  initialFormat: EvidenceExportFormat,
  triggerEl?: HTMLElement | null
): void => {
  const selectedSession = getSelectedHistorySession();

  if (!selectedSession) {
    return;
  }

  historyExportFormat = initialFormat;
  historyExportFormatEl.value = initialFormat;
  renderExportPreview(selectedSession, initialFormat);
  activeHistoryExportTriggerEl = triggerEl ?? null;
  historyExportJsonButtonEl.setAttribute(
    "aria-expanded",
    String(activeHistoryExportTriggerEl === historyExportJsonButtonEl)
  );
  historyExportMdButtonEl.setAttribute(
    "aria-expanded",
    String(activeHistoryExportTriggerEl === historyExportMdButtonEl)
  );

  historyExportModalController.open({
    restoreFocusEl: triggerEl ?? null
  });
};

const closeExportDialog = (): void => {
  historyExportJsonButtonEl.setAttribute("aria-expanded", "false");
  historyExportMdButtonEl.setAttribute("aria-expanded", "false");
  activeHistoryExportTriggerEl = null;
  historyExportModalController.close();
};

const buildEvidenceHtml = (session: HistorySession): string => {
  const markdown = buildEvidenceMarkdown(session, _state.assertions);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QA Evidence Export</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        margin: 24px;
        color: #1f2937;
      }

      h1 {
        margin-bottom: 12px;
      }

      pre {
        white-space: pre-wrap;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 16px;
        background: #f9fafb;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <h1>QA Evidence Export</h1>
    <pre>${escapeHtml(markdown)}</pre>
  </body>
</html>`;
};

const buildExportData = (
  session: HistorySession,
  format: EvidenceExportFormat
): { content: string; mimeType: string; extension: string } => {
  if (format === "markdown") {
    return {
      content: buildEvidenceMarkdown(session, _state.assertions),
      mimeType: "text/markdown",
      extension: "md"
    };
  }

  if (format === "html") {
    return {
      content: buildEvidenceHtml(session),
      mimeType: "text/html",
      extension: "html"
    };
  }

  return {
    content: JSON.stringify(buildEvidenceJson(session, _state.assertions), null, 2),
    mimeType: "application/json",
    extension: "json"
  };
};

const renderExportPreview = (session: HistorySession, format: EvidenceExportFormat): void => {
  const exportData = buildExportData(session, format);
  historyExportPreviewEl.value = exportData.content;
};

// ---------------------------------------------------------------------------
// Replay helpers (QP-007)
// ---------------------------------------------------------------------------

type ReplayItemStatus = "pending" | "running" | "done" | "error";

type ReplayResult = {
  index: number;
  status: ReplayItemStatus;
  responseStatus?: number;
  error?: string;
};

const setReplayArtifactStatus = (message: string): void => {
  historyReplayArtifactStatusEl.textContent = message;
};

const toReplayArtifactRequest = (row: RequestRow): StoredReplayArtifactRequest => ({
  id: row.id,
  method: row.method,
  url: row.url,
  headers: row.headers ?? {},
  ...(typeof row.body === "string" ? { body: row.body } : {})
});

const buildReplayArtifact = (session: HistorySession): StoredReplayArtifact => {
  const createdAt = new Date().toISOString();
  const id = `artifact-${session.id}-${Date.now()}`;
  const requests = session.requests.map(toReplayArtifactRequest);

  return {
    id,
    label: `${session.label} replay artifact`,
    sourceSessionId: session.id,
    createdAt,
    requestCount: requests.length,
    requests
  };
};

const loadLatestArtifactForSession = async (
  sessionId: string
): Promise<StoredReplayArtifact | null> => {
  const artifacts = await loadReplayArtifacts();
  const candidates = artifacts
    .filter((artifact) => artifact.sourceSessionId === sessionId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return candidates[0] ?? null;
};

const saveReplayArtifactForSession = async (
  session: HistorySession
): Promise<StoredReplayArtifact> => {
  const artifact = buildReplayArtifact(session);
  const artifacts = await loadReplayArtifacts();
  const remaining = artifacts.filter((item) => item.sourceSessionId !== session.id);
  const nextArtifacts = [artifact, ...remaining].slice(0, 30);
  await saveReplayArtifacts(nextArtifacts);
  return artifact;
};

const deleteReplayArtifactById = async (artifactId: string): Promise<boolean> => {
  const artifacts = await loadReplayArtifacts();
  const nextArtifacts = artifacts.filter((item) => item.id !== artifactId);

  if (nextArtifacts.length === artifacts.length) {
    return false;
  }

  await saveReplayArtifacts(nextArtifacts);
  return true;
};

const prepareReplayDataForSession = async (session: HistorySession): Promise<void> => {
  currentReplaySessionId = session.id;
  currentReplayArtifactId = null;
  currentReplayRows = session.requests.map(toReplayArtifactRequest);
  renderReplayList(currentReplayRows, []);
  historyReplayCounterEl.textContent = `0 / ${currentReplayRows.length}`;

  const artifact = await loadLatestArtifactForSession(session.id);

  if (!artifact) {
    setReplayArtifactStatus("Artifact not saved yet. Save artifact to freeze replay payload.");
    return;
  }

  currentReplayArtifactId = artifact.id;
  currentReplayRows = artifact.requests;
  renderReplayList(currentReplayRows, []);
  historyReplayCounterEl.textContent = `0 / ${currentReplayRows.length}`;
  setReplayArtifactStatus(`Using saved artifact: ${formatTimestamp(artifact.createdAt)}`);
};

const setReplayStatus = (state: "ready" | "running" | "done" | "cancelled"): void => {
  historyReplayStatusEl.className = `history-replay-status ${state}`;

  const labels: Record<string, string> = {
    ready: "Ready",
    running: "Replaying...",
    done: "Completed",
    cancelled: "Cancelled"
  };

  historyReplayStatusEl.textContent = labels[state] ?? state;
};

const renderReplayList = (rows: StoredReplayArtifactRequest[], results: ReplayResult[]): void => {
  historyReplayCounterEl.textContent = `${results.filter((r) => r.status !== "pending").length} / ${rows.length}`;

  historyReplayListEl.innerHTML = rows
    .map((row, index) => {
      const result = results[index];
      const itemStatus: ReplayItemStatus = result?.status ?? "pending";
      const responseLabel =
        result?.responseStatus != null
          ? String(result.responseStatus)
          : result?.error != null
            ? "Error"
            : "";

      return `<li class="history-replay-item ${escapeHtml(itemStatus)}">
        <span class="replay-indicator"></span>
        <span class="replay-method">${escapeHtml(row.method)}</span>
        <span class="replay-url">${escapeHtml(row.url)}</span>
        ${responseLabel ? `<span class="replay-result">${escapeHtml(responseLabel)}</span>` : ""}
      </li>`;
    })
    .join("");
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const startReplay = async (rows: StoredReplayArtifactRequest[]): Promise<void> => {
  replayAbortController = new AbortController();
  const { signal } = replayAbortController;

  historyReplayStartButtonEl.classList.add("hidden");
  historyReplayCancelButtonEl.classList.remove("hidden");
  setReplayStatus("running");

  const results: ReplayResult[] = rows.map((_, index) => ({
    index,
    status: "pending"
  }));

  renderReplayList(rows, results);

  for (let i = 0; i < rows.length; i++) {
    if (signal.aborted) {
      break;
    }

    results[i] = { index: i, status: "running" };
    renderReplayList(rows, results);

    try {
      const row = rows[i];

      if (!row) {
        results[i] = { index: i, status: "error", error: "Missing row" };
        continue;
      }

      const response = await chrome.runtime.sendMessage({
        type: "REPEAT_REQUEST",
        payload: {
          method: row.method,
          url: row.url,
          headers: row.headers ?? {},
          ...(typeof row.body === "string" ? { body: row.body } : {})
        }
      });

      if (signal.aborted) {
        break;
      }

      const ok =
        response && typeof response === "object" && "ok" in response && response.ok === true;
      const responseStatus =
        ok && "status" in response && typeof response.status === "number"
          ? response.status
          : undefined;

      results[i] = {
        index: i,
        status: "done",
        ...(responseStatus != null ? { responseStatus } : {})
      };
    } catch {
      if (signal.aborted) {
        break;
      }

      results[i] = { index: i, status: "error", error: "Request failed" };
    }

    renderReplayList(rows, results);

    // Small delay between requests to avoid overwhelming the server
    if (i < rows.length - 1 && !signal.aborted) {
      await delay(120);
    }
  }

  if (!signal.aborted) {
    setReplayStatus("done");
    historyReplayCancelButtonEl.classList.add("hidden");
    historyReplayStartButtonEl.classList.remove("hidden");
  }

  replayAbortController = null;
};
