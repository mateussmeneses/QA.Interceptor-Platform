/**
 * History & Evidence feature module.
 * Manages session list, detail panel, and evidence export.
 */

import type {
  AppState,
  RequestRow,
  HistorySession,
  HistoryOutcomeFilter,
  HistorySortOrder,
} from "../shared/types";
import { isHistoryOutcomeFilter } from "../shared/types";
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
  buildEvidenceMarkdown,
} from "../shared/utils";

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

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

let _state: AppState = { requests: [], rules: [], ruleGroups: [], validation: null, assertions: [] };
let selectedHistorySessionId: string | null = null;
let historySearchQuery = "";
let historyOutcomeFilter: HistoryOutcomeFilter = "all";
let historySortOrder: HistorySortOrder = "recent";

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

  const selectedSession =
    filteredSessions.find((s) => s.id === selectedHistorySessionId) ?? null;
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
    if (
      historyOutcomeFilter !== "all" &&
      !matchesHistoryOutcome(session, historyOutcomeFilter)
    ) {
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
    const sessions = buildHistorySessions(_state.requests);
    const session = sessions.find((s) => s.id === selectedHistorySessionId);

    if (!session) {
      return;
    }

    triggerDownload(
      `qa-evidence-${formatDateSlug()}.json`,
      JSON.stringify(session, null, 2),
      "application/json"
    );
  });

  historyExportMdButtonEl.addEventListener("click", () => {
    const sessions = buildHistorySessions(_state.requests);
    const session = sessions.find((s) => s.id === selectedHistorySessionId);

    if (!session) {
      return;
    }

    triggerDownload(
      `qa-evidence-${formatDateSlug()}.md`,
      buildEvidenceMarkdown(session),
      "text/markdown"
    );
  });
};
