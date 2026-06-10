const CAPTURED_REQUESTS_KEY = "capturedRequests";
const RULES_KEY = "rules";
const RULE_VALIDATION_KEY = "ruleValidation";

type ViewId = "rules" | "network" | "mocks" | "history" | "settings";

type ViewMeta = {
  title: string;
  subtitle: string;
};

type RuleType =
  | "rewrite-url"
  | "rewrite-header"
  | "rewrite-query"
  | "rewrite-response"
  | "rewrite-request-body"
  | "block"
  | "redirect"
  | "delay"
  | "mock-response"
  | "mock-status";

type RulesFilterType = "all" | RuleType;
type RulesStatusFilter = "all" | "enabled" | "disabled";
type NetworkStatusFilter = "all" | "pending" | "2xx" | "3xx" | "4xx" | "5xx";
type MockTypeFilter = "all" | "mock-response" | "mock-status";
type MockStatusFilter = "all" | "enabled" | "disabled";
type HistoryOutcomeFilter = "all" | "passed" | "failed" | "pending";
type HistorySortOrder = "recent" | "oldest";

type HistorySession = {
  id: string;
  label: string;
  startedAt: string;
  endedAt: string;
  requests: RequestRow[];
  failedCount: number;
  pendingCount: number;
};

const VIEW_META: Record<ViewId, ViewMeta> = {
  rules: {
    title: "Rules Workspace",
    subtitle: "Requestly-inspired shell with live data widgets."
  },
  network: {
    title: "Network Inspector",
    subtitle: "Traffic table, status chips, and request detail timeline."
  },
  mocks: {
    title: "Mock Playground",
    subtitle: "Mock payload and status authoring with QA scenario hints."
  },
  history: {
    title: "History & Evidence",
    subtitle: "Session list, evidence timeline, and export-ready QA snapshot."
  },
  settings: {
    title: "Settings",
    subtitle: "Preferences and diagnostics preview with explicit non-wired actions."
  }
};

type RequestRow = {
  id: string;
  method: string;
  url: string;
  timestamp: string;
  captureSource?: "network" | "mock";
  resourceType?: string;
  tabId?: number;
  matchedRules: Array<{
    ruleId: string;
    ruleName: string;
    type: string;
  }>;
  response?: {
    status: number;
    durationMs: number;
    timestamp: string;
    body?: string;
  };
};

type RuleRow = {
  id: string;
  name: string;
  type: RuleType;
  enabled: boolean;
  priority: number;
  condition: {
    urlContains?: string;
    method?: string;
  };
  payload: Record<string, unknown>;
};

type RuleValidation = {
  timestamp: string;
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
};

const listEl = document.getElementById("request-list");
const rulesStatsEl = document.getElementById("rules-stats");
const rulesValidationEl = document.getElementById("rules-validation");
const rulesGroupedListEl = document.getElementById("rules-grouped-list");
const rulesEmptyStateEl = document.getElementById("rules-empty-state");
const rulesSearchEl = document.getElementById("rules-search") as HTMLInputElement | null;
const rulesTypeFilterEl = document.getElementById("rules-type-filter") as HTMLSelectElement | null;
const rulesStatusFilterEl = document.getElementById("rules-status-filter") as HTMLSelectElement | null;
const navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".nav-item[data-view]"));
const viewPanels = Array.from(document.querySelectorAll<HTMLElement>(".view-panel[data-panel]"));
const workspaceTitleEl = document.getElementById("workspace-title") as HTMLElement | null;
const workspaceSubtitleEl = document.getElementById("workspace-subtitle") as HTMLElement | null;
const ruleEditorCaptionEl = document.getElementById("rule-editor-caption");
const ruleEditorFormEl = document.getElementById("rule-editor-form") as HTMLFormElement | null;
const editorSaveStatusEl = document.getElementById("editor-save-status");
const editorNameEl = document.getElementById("editor-rule-name") as HTMLInputElement | null;
const editorTypeEl = document.getElementById("editor-rule-type") as HTMLSelectElement | null;
const editorPriorityEl = document.getElementById("editor-rule-priority") as HTMLInputElement | null;
const editorMethodEl = document.getElementById("editor-rule-method") as HTMLSelectElement | null;
const editorEnabledEl = document.getElementById("editor-rule-enabled") as HTMLSelectElement | null;
const editorUrlEl = document.getElementById("editor-rule-url") as HTMLInputElement | null;
const editorPayloadEl = document.getElementById("editor-rule-payload") as HTMLTextAreaElement | null;
const editorSaveButtonEl = document.getElementById("editor-save-button") as HTMLButtonElement | null;
const rulesCreateButtonEl = document.getElementById("rules-create-button") as HTMLButtonElement | null;
const editorDuplicateButtonEl = document.getElementById("editor-duplicate-button") as HTMLButtonElement | null;
const editorDeleteButtonEl = document.getElementById("editor-delete-button") as HTMLButtonElement | null;
const networkRequestListEl = document.getElementById("network-request-list");
const networkSearchEl = document.getElementById("network-search") as HTMLInputElement | null;
const networkMethodFilterEl = document.getElementById("network-method-filter") as HTMLSelectElement | null;
const networkStatusFilterEl = document.getElementById("network-status-filter") as HTMLSelectElement | null;
const networkDetailEmptyEl = document.getElementById("network-detail-empty");
const networkDetailContentEl = document.getElementById("network-detail-content");
const networkDetailMethodEl = document.getElementById("network-detail-method");
const networkDetailUrlEl = document.getElementById("network-detail-url");
const networkDetailIdEl = document.getElementById("network-detail-id");
const networkDetailTimeEl = document.getElementById("network-detail-time");
const networkDetailStatusEl = document.getElementById("network-detail-status");
const networkDetailDurationEl = document.getElementById("network-detail-duration");
const networkDetailSourceEl = document.getElementById("network-detail-source");
const networkDetailResourceEl = document.getElementById("network-detail-resource");
const networkDetailTabEl = document.getElementById("network-detail-tab");
const networkDetailRulesEl = document.getElementById("network-detail-rules");
const networkTimelineBarEl = document.getElementById("network-timeline-bar");
const networkTimelineCaptionEl = document.getElementById("network-timeline-caption");
const networkDetailBodySectionEl = document.getElementById("network-detail-body-section");
const networkDetailBodyEl = document.getElementById("network-detail-body");
const networkCopyCurlButtonEl = document.getElementById("network-copy-curl-button") as HTMLButtonElement | null;
const historyExportJsonButtonEl = document.getElementById("history-export-json-button") as HTMLButtonElement | null;
const historyExportMdButtonEl = document.getElementById("history-export-md-button") as HTMLButtonElement | null;
const mockRuleListEl = document.getElementById("mock-rule-list");
const mockEmptyStateEl = document.getElementById("mock-empty-state");
const mockSearchEl = document.getElementById("mock-search") as HTMLInputElement | null;
const mockTypeFilterEl = document.getElementById("mock-type-filter") as HTMLSelectElement | null;
const mockStatusFilterEl = document.getElementById("mock-status-filter") as HTMLSelectElement | null;
const mockEditorCaptionEl = document.getElementById("mock-editor-caption");
const mockEditorFormEl = document.getElementById("mock-editor-form") as HTMLFormElement | null;
const mockSaveStatusEl = document.getElementById("mock-save-status");
const mockEditorEnabledEl = document.getElementById("mock-editor-enabled") as HTMLSelectElement | null;
const mockEditorMethodEl = document.getElementById("mock-editor-method") as HTMLSelectElement | null;
const mockEditorUrlEl = document.getElementById("mock-editor-url") as HTMLInputElement | null;
const mockEditorHttpStatusEl = document.getElementById("mock-editor-http-status") as HTMLInputElement | null;
const mockEditorDelayMsEl = document.getElementById("mock-editor-delay-ms") as HTMLInputElement | null;
const mockEditorHeadersEl = document.getElementById("mock-editor-headers") as HTMLTextAreaElement | null;
const mockEditorBodyEl = document.getElementById("mock-editor-body") as HTMLTextAreaElement | null;
const mockSaveButtonEl = document.getElementById("mock-save-button") as HTMLButtonElement | null;
const historySessionListEl = document.getElementById("history-session-list");
const historyEmptyStateEl = document.getElementById("history-empty-state");
const historySearchEl = document.getElementById("history-search") as HTMLInputElement | null;
const historyOutcomeFilterEl = document.getElementById("history-outcome-filter") as HTMLSelectElement | null;
const historySortEl = document.getElementById("history-sort") as HTMLSelectElement | null;
const historyDetailEmptyEl = document.getElementById("history-detail-empty");
const historyDetailContentEl = document.getElementById("history-detail-content");
const historyDetailTitleEl = document.getElementById("history-detail-title");
const historyDetailSummaryEl = document.getElementById("history-detail-summary");
const historyKpiRequestsEl = document.getElementById("history-kpi-requests");
const historyKpiFailuresEl = document.getElementById("history-kpi-failures");
const historyKpiDurationEl = document.getElementById("history-kpi-duration");
const historyKpiRulesEl = document.getElementById("history-kpi-rules");
const historyTimelineListEl = document.getElementById("history-timeline-list");
const rulesImportButtonEl = document.getElementById("rules-import-button") as HTMLButtonElement | null;
const rulesExportButtonEl = document.getElementById("rules-export-button") as HTMLButtonElement | null;
const rulesImportInputEl = document.getElementById("rules-import-input") as HTMLInputElement | null;
const networkClearButtonEl = document.getElementById("network-clear-button") as HTMLButtonElement | null;
const networkExportHarButtonEl = document.getElementById("network-export-har-button") as HTMLButtonElement | null;

if (!listEl) {
  throw new Error("Missing request list element");
}

if (
  !rulesStatsEl ||
  !rulesValidationEl ||
  !rulesGroupedListEl ||
  !rulesEmptyStateEl ||
  !rulesSearchEl ||
  !rulesTypeFilterEl ||
  !rulesStatusFilterEl ||
  !workspaceTitleEl ||
  !workspaceSubtitleEl ||
  !ruleEditorCaptionEl ||
  !ruleEditorFormEl ||
  !editorSaveStatusEl ||
  !editorNameEl ||
  !editorTypeEl ||
  !editorPriorityEl ||
  !editorMethodEl ||
  !editorEnabledEl ||
  !editorUrlEl ||
  !editorPayloadEl ||
  !editorSaveButtonEl ||
  !rulesCreateButtonEl ||
  !editorDuplicateButtonEl ||
  !editorDeleteButtonEl ||
  !networkRequestListEl ||
  !networkSearchEl ||
  !networkMethodFilterEl ||
  !networkStatusFilterEl ||
  !networkDetailEmptyEl ||
  !networkDetailContentEl ||
  !networkDetailMethodEl ||
  !networkDetailUrlEl ||
  !networkDetailIdEl ||
  !networkDetailTimeEl ||
  !networkDetailStatusEl ||
  !networkDetailDurationEl ||
  !networkDetailSourceEl ||
  !networkDetailResourceEl ||
  !networkDetailTabEl ||
  !networkDetailRulesEl ||
  !networkTimelineBarEl ||
  !networkTimelineCaptionEl ||
  !networkDetailBodySectionEl ||
  !networkDetailBodyEl ||
  !networkCopyCurlButtonEl ||
  !historyExportJsonButtonEl ||
  !historyExportMdButtonEl ||
  !mockRuleListEl ||
  !mockEmptyStateEl ||
  !mockSearchEl ||
  !mockTypeFilterEl ||
  !mockStatusFilterEl ||
  !mockEditorCaptionEl ||
  !mockEditorFormEl ||
  !mockSaveStatusEl ||
  !mockEditorEnabledEl ||
  !mockEditorMethodEl ||
  !mockEditorUrlEl ||
  !mockEditorHttpStatusEl ||
  !mockEditorDelayMsEl ||
  !mockEditorHeadersEl ||
  !mockEditorBodyEl ||
  !mockSaveButtonEl ||
  !historySessionListEl ||
  !historyEmptyStateEl ||
  !historySearchEl ||
  !historyOutcomeFilterEl ||
  !historySortEl ||
  !historyDetailEmptyEl ||
  !historyDetailContentEl ||
  !historyDetailTitleEl ||
  !historyDetailSummaryEl ||
  !historyKpiRequestsEl ||
  !historyKpiFailuresEl ||
  !historyKpiDurationEl ||
  !historyKpiRulesEl ||
  !historyTimelineListEl ||
  !rulesImportButtonEl ||
  !rulesExportButtonEl ||
  !rulesImportInputEl ||
  !networkClearButtonEl ||
  !networkExportHarButtonEl
) {
  throw new Error("Missing sidepanel UI element");
}

const workspaceTitle = workspaceTitleEl!;
const workspaceSubtitle = workspaceSubtitleEl!;

let currentRequests: RequestRow[] = [];
let currentRules: RuleRow[] = [];
let currentValidation: RuleValidation | null = null;
let activeView: ViewId = "rules";
let selectedRuleId: string | null = null;
let rulesSearchQuery = "";
let rulesTypeFilter: RulesFilterType = "all";
let rulesStatusFilter: RulesStatusFilter = "all";
let selectedNetworkRequestId: string | null = null;
let networkSearchQuery = "";
let networkMethodFilter = "all";
let networkStatusFilter: NetworkStatusFilter = "all";
let selectedMockRuleId: string | null = null;
let mockSearchQuery = "";
let mockTypeFilter: MockTypeFilter = "all";
let mockStatusFilter: MockStatusFilter = "all";
let selectedHistorySessionId: string | null = null;
let historySearchQuery = "";
let historyOutcomeFilter: HistoryOutcomeFilter = "all";
let historySortOrder: HistorySortOrder = "recent";

const render = () => {
  renderRules(currentRules);
  renderRequests(currentRequests);
  renderNetworkInspector(currentRequests);
  renderMockPlayground(currentRules);
  renderHistoryEvidence(currentRequests);
};

const renderRequests = (rows: RequestRow[]) => {
  if (rows.length === 0) {
    listEl.innerHTML = '<li class="placeholder">No traffic captured yet.</li>';
    return;
  }

  listEl.innerHTML = rows
    .map(
      (row) =>
        `<li data-request-id="${escapeHtml(row.id)}"><div class="request-line"><strong>${escapeHtml(row.method)}</strong><span>${escapeHtml(row.url)}</span></div><div class="request-meta"><small>${formatTimestamp(row.timestamp)}</small>${row.response ? `<small class="response-status">${escapeHtml(String(row.response.status))} · ${escapeHtml(formatDuration(row.response.durationMs))}</small>` : `<small class="response-status pending">Waiting for response...</small>`}</div><div class="rule-chips">${renderRuleChips(row.matchedRules)}</div></li>`
    )
    .join("");
};

const renderRules = (rows: RuleRow[]) => {
  rulesStatsEl.textContent = `${rows.filter((rule) => rule.enabled).length} enabled / ${rows.length} total`;
  renderValidationStatus(currentValidation);

  const filteredRows = applyRuleFilters(rows);

  if (filteredRows.length > 0) {
    const hasSelection = selectedRuleId
      ? filteredRows.some((rule) => rule.id === selectedRuleId)
      : false;

    if (!hasSelection) {
      selectedRuleId = filteredRows[0].id;
    }
  } else {
    selectedRuleId = null;
  }

  if (rows.length === 0) {
    rulesGroupedListEl.innerHTML = "";
    rulesEmptyStateEl.textContent = "No rules configured yet.";
    rulesEmptyStateEl.classList.remove("hidden");
    setEditorFieldsDisabled(true);
    ruleEditorCaptionEl.textContent = "No rules available. Add a rule to edit fields.";
    setEditorSaveStatus("Rules editor is waiting for data.", "neutral");
    return;
  }

  if (filteredRows.length === 0) {
    rulesGroupedListEl.innerHTML = "";
    rulesEmptyStateEl.textContent = "No rules match current filters.";
    rulesEmptyStateEl.classList.remove("hidden");
    setEditorFieldsDisabled(true);
    ruleEditorCaptionEl.textContent = "Adjust filters to edit a rule.";
    setEditorSaveStatus("No filtered rule selected.", "neutral");
    return;
  }

  rulesEmptyStateEl.classList.add("hidden");
  rulesGroupedListEl.innerHTML = renderRuleGroups(filteredRows);

  const selectedRule = filteredRows.find((rule) => rule.id === selectedRuleId) ?? null;
  populateEditor(selectedRule);
};

const renderValidationStatus = (validation: RuleValidation | null) => {
  if (!validation) {
    rulesValidationEl.innerHTML = '<span class="validation-pill neutral">Validation: pending</span>';
    return;
  }

  const summaryClass = validation.passed ? "ok" : "fail";
  const checks = validation.checks
    .map(
      (check) =>
        `<li class="validation-item ${check.passed ? "ok" : "fail"}">${escapeHtml(check.name)}: ${escapeHtml(check.details)}</li>`
    )
    .join("");

  rulesValidationEl.innerHTML = `<details class="validation-details"><summary class="validation-pill ${summaryClass}">Validation: ${validation.passed ? "passed" : "failed"} (${formatTimestamp(validation.timestamp)})</summary><ul class="validation-list">${checks}</ul></details>`;
};

const loadCapturedRequests = async () => {
  const stored = await chrome.storage.local.get([CAPTURED_REQUESTS_KEY, RULES_KEY, RULE_VALIDATION_KEY]);
  currentRequests = readRequestRows(stored[CAPTURED_REQUESTS_KEY]);
  currentRules = readRuleRows(stored[RULES_KEY]);
  currentValidation = readRuleValidation(stored[RULE_VALIDATION_KEY]);
  render();
};

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes[CAPTURED_REQUESTS_KEY]) {
    currentRequests = readRequestRows(changes[CAPTURED_REQUESTS_KEY].newValue);
  }

  if (changes[RULES_KEY]) {
    currentRules = readRuleRows(changes[RULES_KEY].newValue);
  }

  if (changes[RULE_VALIDATION_KEY]) {
    currentValidation = readRuleValidation(changes[RULE_VALIDATION_KEY].newValue);
  }

  render();
});

rulesGroupedListEl.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement | null;
  const selectButton = target?.closest("[data-rule-select]") as HTMLButtonElement | null;
  const toggleButton = target?.closest("[data-rule-toggle]") as HTMLButtonElement | null;

  if (selectButton) {
    const nextSelectedId = selectButton.dataset.ruleSelect;

    if (!nextSelectedId) {
      return;
    }

    selectedRuleId = nextSelectedId;
    renderRules(currentRules);
    return;
  }

  if (!toggleButton) {
    return;
  }

  const ruleId = toggleButton.dataset.ruleToggle;

  if (!ruleId) {
    return;
  }

  const nextRules = currentRules.map((rule) =>
    rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
  );

  currentRules = nextRules;
  await chrome.storage.local.set({ [RULES_KEY]: nextRules });
});

rulesSearchEl.addEventListener("input", () => {
  rulesSearchQuery = rulesSearchEl.value.trim().toLowerCase();
  renderRules(currentRules);
});

rulesTypeFilterEl.addEventListener("change", () => {
  const candidate = rulesTypeFilterEl.value;
  rulesTypeFilter = isRuleType(candidate) ? candidate : "all";
  renderRules(currentRules);
});

rulesStatusFilterEl.addEventListener("change", () => {
  const candidate = rulesStatusFilterEl.value;
  rulesStatusFilter = candidate === "enabled" || candidate === "disabled" ? candidate : "all";
  renderRules(currentRules);
});

rulesCreateButtonEl.addEventListener("click", async () => {
  const nextRule = createDefaultRule();
  const nextRules = [nextRule, ...currentRules];

  currentRules = nextRules;
  selectedRuleId = nextRule.id;
  await chrome.storage.local.set({ [RULES_KEY]: nextRules });
  setEditorSaveStatus("New rule created. Update fields and click Save Changes.", "ok");
});

rulesExportButtonEl.addEventListener("click", () => {
  if (currentRules.length === 0) {
    setEditorSaveStatus("No rules to export.", "neutral");
    return;
  }

  triggerDownload(
    `qa-interceptor-rules-${formatDateSlug()}.json`,
    JSON.stringify(currentRules, null, 2),
    "application/json"
  );
});

rulesImportButtonEl.addEventListener("click", () => {
  rulesImportInputEl.value = "";
  rulesImportInputEl.click();
});

rulesImportInputEl.addEventListener("change", async () => {
  const file = rulesImportInputEl.files?.[0];

  if (!file) {
    return;
  }

  const text = await file.text();

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    setEditorSaveStatus("Import failed: file is not valid JSON.", "error");
    return;
  }

  if (!Array.isArray(parsed)) {
    setEditorSaveStatus("Import failed: expected a JSON array of rules.", "error");
    return;
  }

  const imported = parsed.filter(isRuleRow);

  if (imported.length === 0) {
    setEditorSaveStatus("Import failed: no valid rules found in file.", "error");
    return;
  }

  const existingIds = new Set(currentRules.map((r) => r.id));
  const newRules = imported.filter((r) => !existingIds.has(r.id));
  const nextRules = [...currentRules, ...newRules];

  currentRules = nextRules;
  await chrome.storage.local.set({ [RULES_KEY]: nextRules });
  setEditorSaveStatus(
    `Imported ${newRules.length} rule(s). ${imported.length - newRules.length} skipped (duplicate IDs).`,
    "ok"
  );
});

editorDuplicateButtonEl.addEventListener("click", async () => {
  if (!selectedRuleId) {
    setEditorSaveStatus("Select a rule before duplicating.", "error");
    return;
  }

  const sourceRule = currentRules.find((rule) => rule.id === selectedRuleId);

  if (!sourceRule) {
    setEditorSaveStatus("Selected rule was not found.", "error");
    return;
  }

  const duplicatedRule: RuleRow = {
    ...sourceRule,
    id: createRuleId(),
    name: `${sourceRule.name} Copy`,
    priority: sourceRule.priority + 1
  };

  const nextRules = [duplicatedRule, ...currentRules];

  currentRules = nextRules;
  selectedRuleId = duplicatedRule.id;
  await chrome.storage.local.set({ [RULES_KEY]: nextRules });
  setEditorSaveStatus("Rule duplicated. Review and save if needed.", "ok");
});

editorDeleteButtonEl.addEventListener("click", async () => {
  if (!selectedRuleId) {
    setEditorSaveStatus("Select a rule before deleting.", "error");
    return;
  }

  const nextRules = currentRules.filter((rule) => rule.id !== selectedRuleId);

  if (nextRules.length === currentRules.length) {
    setEditorSaveStatus("Selected rule was not found.", "error");
    return;
  }

  currentRules = nextRules;
  selectedRuleId = nextRules[0]?.id ?? null;
  await chrome.storage.local.set({ [RULES_KEY]: nextRules });
  setEditorSaveStatus("Rule deleted.", "ok");
});

networkSearchEl.addEventListener("input", () => {
  networkSearchQuery = networkSearchEl.value.trim().toLowerCase();
  renderNetworkInspector(currentRequests);
});

networkMethodFilterEl.addEventListener("change", () => {
  networkMethodFilter = networkMethodFilterEl.value;
  renderNetworkInspector(currentRequests);
});

networkStatusFilterEl.addEventListener("change", () => {
  const candidate = networkStatusFilterEl.value;
  networkStatusFilter = isNetworkStatusFilter(candidate) ? candidate : "all";
  renderNetworkInspector(currentRequests);
});

networkClearButtonEl.addEventListener("click", async () => {
  currentRequests = [];
  selectedNetworkRequestId = null;
  await chrome.storage.local.set({ [CAPTURED_REQUESTS_KEY]: [] });
  renderNetworkInspector(currentRequests);
});

networkExportHarButtonEl.addEventListener("click", () => {
  if (currentRequests.length === 0) {
    return;
  }

  triggerDownload(
    `qa-interceptor-har-${formatDateSlug()}.json`,
    JSON.stringify(buildHar(currentRequests), null, 2),
    "application/json"
  );
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
  renderNetworkInspector(currentRequests);
});

mockSearchEl.addEventListener("input", () => {
  mockSearchQuery = mockSearchEl.value.trim().toLowerCase();
  renderMockPlayground(currentRules);
});

mockTypeFilterEl.addEventListener("change", () => {
  const candidate = mockTypeFilterEl.value;
  mockTypeFilter = candidate === "mock-response" || candidate === "mock-status" ? candidate : "all";
  renderMockPlayground(currentRules);
});

mockStatusFilterEl.addEventListener("change", () => {
  const candidate = mockStatusFilterEl.value;
  mockStatusFilter = candidate === "enabled" || candidate === "disabled" ? candidate : "all";
  renderMockPlayground(currentRules);
});

historySearchEl.addEventListener("input", () => {
  historySearchQuery = historySearchEl.value.trim().toLowerCase();
  renderHistoryEvidence(currentRequests);
});

historyOutcomeFilterEl.addEventListener("change", () => {
  const candidate = historyOutcomeFilterEl.value;
  historyOutcomeFilter = isHistoryOutcomeFilter(candidate) ? candidate : "all";
  renderHistoryEvidence(currentRequests);
});

historySortEl.addEventListener("change", () => {
  historySortOrder = historySortEl.value === "oldest" ? "oldest" : "recent";
  renderHistoryEvidence(currentRequests);
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
  renderHistoryEvidence(currentRequests);
});

historyExportJsonButtonEl.addEventListener("click", () => {
  const sessions = buildHistorySessions(currentRequests);
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
  const sessions = buildHistorySessions(currentRequests);
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

networkCopyCurlButtonEl.addEventListener("click", () => {
  const row = currentRequests.find((r) => r.id === selectedNetworkRequestId);

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

mockRuleListEl.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement | null;
  const selectButton = target?.closest("[data-mock-select]") as HTMLButtonElement | null;
  const toggleButton = target?.closest("[data-mock-toggle]") as HTMLButtonElement | null;

  if (selectButton) {
    const ruleId = selectButton.dataset.mockSelect;

    if (!ruleId) {
      return;
    }

    selectedMockRuleId = ruleId;
    renderMockPlayground(currentRules);
    return;
  }

  if (!toggleButton) {
    return;
  }

  const ruleId = toggleButton.dataset.mockToggle;

  if (!ruleId) {
    return;
  }

  const nextRules = currentRules.map((rule) =>
    rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
  );

  currentRules = nextRules;
  await chrome.storage.local.set({ [RULES_KEY]: nextRules });
});

for (const field of [
  mockEditorEnabledEl,
  mockEditorMethodEl,
  mockEditorUrlEl,
  mockEditorHttpStatusEl,
  mockEditorDelayMsEl,
  mockEditorHeadersEl,
  mockEditorBodyEl
]) {
  field.addEventListener("input", () => {
    if (selectedMockRuleId) {
      setMockSaveStatus("Unsaved mock changes.", "neutral");
    }
  });
}

mockEditorFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedMockRuleId) {
    setMockSaveStatus("Select a mock rule before saving.", "error");
    return;
  }

  const currentRule = currentRules.find((rule) => rule.id === selectedMockRuleId && isMockRule(rule));

  if (!currentRule) {
    setMockSaveStatus("Selected mock rule was not found.", "error");
    return;
  }

  const nextStatus = Number.parseInt(mockEditorHttpStatusEl.value, 10);

  if (!Number.isFinite(nextStatus) || nextStatus < 100 || nextStatus > 599) {
    setMockSaveStatus("HTTP status must be a number between 100 and 599.", "error");
    return;
  }

  const nextDelayRaw = Number.parseInt(mockEditorDelayMsEl.value || "0", 10);
  const nextDelay = Number.isFinite(nextDelayRaw) && nextDelayRaw > 0 ? nextDelayRaw : 0;

  let nextHeaders: Record<string, string> = {};

  if (mockEditorHeadersEl.value.trim()) {
    try {
      const parsed = JSON.parse(mockEditorHeadersEl.value);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setMockSaveStatus("Headers must be a JSON object.", "error");
        return;
      }

      nextHeaders = Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)])
      );
    } catch {
      setMockSaveStatus("Headers JSON is invalid.", "error");
      return;
    }
  }

  let nextBody: unknown = "";

  if (mockEditorBodyEl.value.trim()) {
    try {
      nextBody = JSON.parse(mockEditorBodyEl.value);
    } catch {
      nextBody = mockEditorBodyEl.value;
    }
  }

  const methodValue = mockEditorMethodEl.value.trim().toUpperCase();
  const urlContainsValue = mockEditorUrlEl.value.trim();

  const nextRules = currentRules.map((rule) => {
    if (rule.id !== selectedMockRuleId) {
      return rule;
    }

    const payload: Record<string, unknown> = {
      ...(rule.payload ?? {}),
      status: nextStatus,
      ...(nextDelay > 0 ? { delayMs: nextDelay } : {}),
      ...(Object.keys(nextHeaders).length > 0 ? { headers: nextHeaders } : {})
    };

    if (rule.type === "mock-response") {
      payload.body = nextBody;
    }

    return {
      ...rule,
      enabled: mockEditorEnabledEl.value === "true",
      condition: {
        ...(methodValue ? { method: methodValue } : {}),
        ...(urlContainsValue ? { urlContains: urlContainsValue } : {})
      },
      payload
    };
  });

  currentRules = nextRules;
  await chrome.storage.local.set({ [RULES_KEY]: nextRules });
  setMockSaveStatus("Mock rule saved to local storage.", "ok");
});

for (const field of [editorNameEl, editorPriorityEl, editorMethodEl, editorEnabledEl, editorUrlEl, editorPayloadEl]) {
  field.addEventListener("input", () => {
    if (selectedRuleId) {
      setEditorSaveStatus("Unsaved changes.", "neutral");
    }
  });
}

ruleEditorFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedRuleId) {
    setEditorSaveStatus("Select a rule before saving.", "error");
    return;
  }

  const currentRule = currentRules.find((rule) => rule.id === selectedRuleId);

  if (!currentRule) {
    setEditorSaveStatus("Selected rule was not found.", "error");
    return;
  }

  let parsedPayload: Record<string, unknown>;

  try {
    const parsed = JSON.parse(editorPayloadEl.value || "{}");

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setEditorSaveStatus("Payload must be a JSON object.", "error");
      return;
    }

    parsedPayload = parsed as Record<string, unknown>;
  } catch {
    setEditorSaveStatus("Payload JSON is invalid. Fix it before saving.", "error");
    return;
  }

  const nextPriority = Number.parseInt(editorPriorityEl.value, 10);
  const normalizedPriority = Number.isFinite(nextPriority) && nextPriority > 0 ? nextPriority : 1;
  const methodValue = editorMethodEl.value.trim().toUpperCase();
  const urlContainsValue = editorUrlEl.value.trim();

  const nextRules = currentRules.map((rule) => {
    if (rule.id !== selectedRuleId) {
      return rule;
    }

    return {
      ...rule,
      name: editorNameEl.value.trim() || rule.name,
      enabled: editorEnabledEl.value === "true",
      priority: normalizedPriority,
      condition: {
        ...(methodValue ? { method: methodValue } : {}),
        ...(urlContainsValue ? { urlContains: urlContainsValue } : {})
      },
      payload: parsedPayload
    };
  });

  currentRules = nextRules;
  await chrome.storage.local.set({ [RULES_KEY]: nextRules });
  setEditorSaveStatus("Rule changes saved to local storage.", "ok");
});

for (const button of navButtons) {
  button.addEventListener("click", () => {
    const view = button.dataset.view;

    if (!isViewId(view)) {
      return;
    }

    setActiveView(view);
  });
}

function setActiveView(view: ViewId) {
  activeView = view;

  for (const button of navButtons) {
    button.classList.toggle("active", button.dataset.view === view);
  }

  for (const panel of viewPanels) {
    panel.classList.toggle("hidden", panel.dataset.panel !== view);
  }

  workspaceTitle.textContent = VIEW_META[view].title;
  workspaceSubtitle.textContent = VIEW_META[view].subtitle;
}

setActiveView(activeView);

void loadCapturedRequests();

const isViewId = (value: string | undefined): value is ViewId =>
  value === "rules" ||
  value === "network" ||
  value === "mocks" ||
  value === "history" ||
  value === "settings";

const readRequestRows = (value: unknown): RequestRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRequestRow);
};

const readRuleRows = (value: unknown): RuleRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRuleRow);
};

const applyRuleFilters = (rows: RuleRow[]): RuleRow[] =>
  rows.filter((rule) => {
    if (rulesTypeFilter !== "all" && rule.type !== rulesTypeFilter) {
      return false;
    }

    if (rulesStatusFilter === "enabled" && !rule.enabled) {
      return false;
    }

    if (rulesStatusFilter === "disabled" && rule.enabled) {
      return false;
    }

    if (!rulesSearchQuery) {
      return true;
    }

    const haystack = `${rule.name} ${rule.type} ${rule.condition.method ?? ""} ${rule.condition.urlContains ?? ""}`.toLowerCase();
    return haystack.includes(rulesSearchQuery);
  });

const renderNetworkInspector = (rows: RequestRow[]) => {
  const filteredRows = applyNetworkFilters(rows);

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
    networkRequestListEl.innerHTML = '<li class="placeholder">No requests match current filters.</li>';
    renderNetworkDetail(null);
    return;
  }

  networkRequestListEl.innerHTML = filteredRows
    .map((row) => {
      const isActive = selectedNetworkRequestId === row.id;
      const statusValue = row.response ? String(row.response.status) : "Pending";
      const durationLabel = row.response ? formatDuration(row.response.durationMs) : "-";

      return `<li class="network-row${isActive ? " active" : ""}" data-network-request-id="${escapeHtml(row.id)}"><div class="network-row-main"><span class="status-chip">${escapeHtml(row.method)}</span><span class="network-row-url" title="${escapeHtml(row.url)}">${escapeHtml(row.url)}</span><span class="status-chip ${escapeHtml(getStatusToneClass(row.response?.status))}">${escapeHtml(statusValue)}</span><span class="network-row-time">${escapeHtml(durationLabel)}</span></div><div class="network-waterfall"><span style="width:${escapeHtml(String(getTimelineWidthPercent(row.response?.durationMs)))}%"></span></div></li>`;
    })
    .join("");

  const selectedRow = filteredRows.find((row) => row.id === selectedNetworkRequestId) ?? null;
  renderNetworkDetail(selectedRow);
};

const renderNetworkDetail = (row: RequestRow | null) => {
  if (!row) {
    networkDetailEmptyEl.classList.remove("hidden");
    networkDetailContentEl.classList.add("hidden");
    return;
  }

  networkDetailEmptyEl.classList.add("hidden");
  networkDetailContentEl.classList.remove("hidden");

  networkDetailMethodEl.textContent = row.method;
  networkDetailUrlEl.textContent = row.url;
  networkDetailIdEl.textContent = row.id;
  networkDetailTimeEl.textContent = formatTimestamp(row.timestamp);
  networkDetailStatusEl.textContent = row.response ? String(row.response.status) : "Pending";
  networkDetailDurationEl.textContent = row.response ? formatDuration(row.response.durationMs) : "Waiting";
  networkDetailSourceEl.textContent = row.captureSource ?? "network";
  networkDetailResourceEl.textContent = row.resourceType ?? "unknown";
  networkDetailTabEl.textContent =
    typeof row.tabId === "number" && row.tabId >= 0 ? String(row.tabId) : "n/a";

  networkDetailStatusEl.className = `status-chip ${getStatusToneClass(row.response?.status)}`;
  networkDetailMethodEl.className = "status-chip";

  networkDetailRulesEl.innerHTML = renderRuleChips(row.matchedRules);
  networkTimelineBarEl.style.width = `${String(getTimelineWidthPercent(row.response?.durationMs))}%`;
  networkTimelineCaptionEl.textContent = row.response
    ? `Response completed in ${formatDuration(row.response.durationMs)}.`
    : "No response timing yet.";

  const body = row.response?.body;

  if (body) {
    networkDetailBodySectionEl.classList.remove("hidden");
    networkDetailBodyEl.textContent = body;
  } else {
    networkDetailBodySectionEl.classList.add("hidden");
    networkDetailBodyEl.textContent = "";
  }
};

const renderMockPlayground = (rows: RuleRow[]) => {
  const mockRules = rows.filter(isMockRule);
  const filteredRows = applyMockFilters(mockRules);

  if (filteredRows.length > 0) {
    const hasSelection = selectedMockRuleId
      ? filteredRows.some((rule) => rule.id === selectedMockRuleId)
      : false;

    if (!hasSelection) {
      selectedMockRuleId = filteredRows[0].id;
    }
  } else {
    selectedMockRuleId = null;
  }

  if (mockRules.length === 0) {
    mockRuleListEl.innerHTML = "";
    mockEmptyStateEl.textContent = "No mock rules available yet.";
    mockEmptyStateEl.classList.remove("hidden");
    setMockEditorFieldsDisabled(true);
    mockEditorCaptionEl.textContent = "Create a mock rule to start editing payloads.";
    setMockSaveStatus("Mock editor is waiting for data.", "neutral");
    return;
  }

  if (filteredRows.length === 0) {
    mockRuleListEl.innerHTML = "";
    mockEmptyStateEl.textContent = "No mock rules match current filters.";
    mockEmptyStateEl.classList.remove("hidden");
    setMockEditorFieldsDisabled(true);
    mockEditorCaptionEl.textContent = "Adjust filters to select a mock rule.";
    setMockSaveStatus("No filtered mock selected.", "neutral");
    return;
  }

  mockEmptyStateEl.classList.add("hidden");
  mockRuleListEl.innerHTML = filteredRows
    .map((rule) => {
      const activeClass = selectedMockRuleId === rule.id ? " active" : "";
      const statusLabel = String(rule.payload.status ?? (rule.type === "mock-status" ? 200 : 200));

      return `<li class="mock-rule-card${activeClass}" data-mock-rule-id="${escapeHtml(rule.id)}"><div class="mock-rule-top"><div><strong>${escapeHtml(rule.name)}</strong><div class="mock-rule-url">${escapeHtml(rule.condition.urlContains ?? "Any URL")}</div></div><button type="button" class="rule-select" data-mock-select="${escapeHtml(rule.id)}">Edit</button></div><div class="mock-rule-meta"><span class="pill muted">${escapeHtml(formatRuleType(rule.type))}</span><span class="pill muted">Status ${escapeHtml(statusLabel)}</span>${rule.enabled ? "" : '<span class="pill muted">Disabled</span>'}</div><div class="rule-meta"><small>${escapeHtml(formatRuleCondition(rule.condition))}</small><button type="button" class="rule-toggle" data-mock-toggle="${escapeHtml(rule.id)}">${rule.enabled ? "Disable" : "Enable"}</button></div></li>`;
    })
    .join("");

  const selectedRule = filteredRows.find((rule) => rule.id === selectedMockRuleId) ?? null;
  populateMockEditor(selectedRule);
};

const applyMockFilters = (rows: RuleRow[]): RuleRow[] =>
  rows
    .filter((rule) => {
      if (mockTypeFilter !== "all" && rule.type !== mockTypeFilter) {
        return false;
      }

      if (mockStatusFilter === "enabled" && !rule.enabled) {
        return false;
      }

      if (mockStatusFilter === "disabled" && rule.enabled) {
        return false;
      }

      if (!mockSearchQuery) {
        return true;
      }

      const haystack = `${rule.name} ${rule.condition.urlContains ?? ""} ${rule.condition.method ?? ""}`.toLowerCase();
      return haystack.includes(mockSearchQuery);
    })
    .sort((a, b) => b.priority - a.priority);

const populateMockEditor = (rule: RuleRow | null) => {
  if (!rule || !isMockRule(rule)) {
    setMockEditorFieldsDisabled(true);
    mockEditorCaptionEl.textContent = "Select a mock rule to edit payload and status.";
    setMockSaveStatus("Mock editor idle.", "neutral");
    return;
  }

  setMockEditorFieldsDisabled(false);
  mockEditorCaptionEl.textContent = `Editing ${rule.name}`;

  const payload = rule.payload ?? {};

  mockEditorEnabledEl.value = String(rule.enabled);
  mockEditorMethodEl.value = rule.condition.method ?? "";
  mockEditorUrlEl.value = rule.condition.urlContains ?? "";
  mockEditorHttpStatusEl.value = String(payload.status ?? 200);
  mockEditorDelayMsEl.value = String(payload.delayMs ?? 0);
  mockEditorHeadersEl.value = JSON.stringify(payload.headers ?? {}, null, 2);

  if (rule.type === "mock-response") {
    const bodyValue = payload.body;
    mockEditorBodyEl.value =
      typeof bodyValue === "string" ? bodyValue : JSON.stringify(bodyValue ?? {}, null, 2);
    mockEditorBodyEl.disabled = false;
  } else {
    mockEditorBodyEl.value = "Status-only mock (body not used in this rule type).";
    mockEditorBodyEl.disabled = true;
  }

  setMockSaveStatus("Mock loaded. You can edit and save.", "neutral");
};

const renderHistoryEvidence = (rows: RequestRow[]) => {
  const sessions = buildHistorySessions(rows);
  const filteredSessions = applyHistoryFilters(sessions);

  if (filteredSessions.length > 0) {
    const hasSelection = selectedHistorySessionId
      ? filteredSessions.some((session) => session.id === selectedHistorySessionId)
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

  const selectedSession = filteredSessions.find((session) => session.id === selectedHistorySessionId) ?? null;
  renderHistoryDetail(selectedSession);
};

const renderHistoryDetail = (session: HistorySession | null) => {
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

const buildHistorySessions = (rows: RequestRow[]): HistorySession[] => {
  if (rows.length === 0) {
    return [];
  }

  const buckets = new Map<string, RequestRow[]>();

  for (const row of rows) {
    const date = new Date(row.timestamp);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const bucketStart = Math.floor(date.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000);
    const bucketId = String(bucketStart);
    const current = buckets.get(bucketId) ?? [];
    current.push(row);
    buckets.set(bucketId, current);
  }

  return Array.from(buckets.entries())
    .map(([bucketId, bucketRows]) => {
      const sortedRows = bucketRows
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const startedAt = sortedRows[0]?.timestamp ?? new Date(Number(bucketId)).toISOString();
      const endedAt = sortedRows[sortedRows.length - 1]?.timestamp ?? startedAt;
      const failedCount = sortedRows.filter((row) => {
        const status = row.response?.status;
        return typeof status === "number" && status >= 400;
      }).length;
      const pendingCount = sortedRows.filter((row) => !row.response).length;

      return {
        id: `session-${bucketId}`,
        label: `Session ${formatTimestamp(startedAt)}`,
        startedAt,
        endedAt,
        requests: sortedRows,
        failedCount,
        pendingCount
      };
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
};

const applyHistoryFilters = (sessions: HistorySession[]): HistorySession[] => {
  const filtered = sessions.filter((session) => {
    if (historyOutcomeFilter !== "all" && !matchesHistoryOutcome(session, historyOutcomeFilter)) {
      return false;
    }

    if (!historySearchQuery) {
      return true;
    }

    const haystack = session.requests.map((request) => `${request.method} ${request.url}`).join(" ").toLowerCase();
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

const isHistoryOutcomeFilter = (value: string): value is HistoryOutcomeFilter =>
  value === "all" || value === "passed" || value === "failed" || value === "pending";

const computeAverageDuration = (rows: RequestRow[]): number => {
  const durations = rows
    .map((row) => row.response?.durationMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);

  if (durations.length === 0) {
    return 0;
  }

  const total = durations.reduce((sum, value) => sum + value, 0);
  return Math.round(total / durations.length);
};

const getUniqueMatchedRulesCount = (rows: RequestRow[]): number => {
  const ids = new Set<string>();

  for (const row of rows) {
    for (const matched of row.matchedRules) {
      ids.add(matched.ruleId);
    }
  }

  return ids.size;
};

const createDefaultRule = (): RuleRow => ({
  id: createRuleId(),
  name: "New Delay Rule",
  type: "delay",
  enabled: false,
  priority: 100,
  condition: {
    urlContains: "/api"
  },
  payload: {
    delayMs: 500
  }
});

const createRuleId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `rule-${crypto.randomUUID()}`;
  }

  return `rule-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const setMockEditorFieldsDisabled = (disabled: boolean) => {
  mockEditorEnabledEl.disabled = disabled;
  mockEditorMethodEl.disabled = disabled;
  mockEditorUrlEl.disabled = disabled;
  mockEditorHttpStatusEl.disabled = disabled;
  mockEditorDelayMsEl.disabled = disabled;
  mockEditorHeadersEl.disabled = disabled;
  mockEditorBodyEl.disabled = disabled;
  mockSaveButtonEl.disabled = disabled;
};

const setMockSaveStatus = (message: string, tone: "neutral" | "ok" | "error") => {
  mockSaveStatusEl.textContent = message;
  mockSaveStatusEl.classList.remove("ok", "error");

  if (tone === "ok") {
    mockSaveStatusEl.classList.add("ok");
    return;
  }

  if (tone === "error") {
    mockSaveStatusEl.classList.add("error");
  }
};

const applyNetworkFilters = (rows: RequestRow[]): RequestRow[] => {
  return rows
    .filter((row) => {
      if (networkMethodFilter !== "all" && row.method !== networkMethodFilter) {
        return false;
      }

      if (networkStatusFilter !== "all" && !matchesStatusFilter(row.response?.status, networkStatusFilter)) {
        return false;
      }

      if (!networkSearchQuery) {
        return true;
      }

      const rulesSummary = row.matchedRules.map((rule) => rule.ruleName).join(" ");
      const haystack = `${row.method} ${row.url} ${rulesSummary}`.toLowerCase();
      return haystack.includes(networkSearchQuery);
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

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

const getStatusToneClass = (status: number | undefined): "ok" | "redirect" | "client" | "server" | "pending" => {
  if (typeof status !== "number") {
    return "pending";
  }

  if (status >= 200 && status < 300) {
    return "ok";
  }

  if (status >= 300 && status < 400) {
    return "redirect";
  }

  if (status >= 400 && status < 500) {
    return "client";
  }

  return "server";
};

const getTimelineWidthPercent = (durationMs: number | undefined): number => {
  if (!durationMs || durationMs <= 0) {
    return 0;
  }

  return Math.max(4, Math.min(100, Math.round((durationMs / 2000) * 100)));
};

const isNetworkStatusFilter = (value: string): value is NetworkStatusFilter =>
  value === "all" ||
  value === "pending" ||
  value === "2xx" ||
  value === "3xx" ||
  value === "4xx" ||
  value === "5xx";

const renderRuleGroups = (rows: RuleRow[]): string => {
  const groups = groupRulesByType(rows);

  return Object.entries(groups)
    .map(([groupType, groupRows]) => {
      const items = groupRows
        .map((rule) => {
          const activeClass = selectedRuleId === rule.id ? " active" : "";

          return `<li class="rule-card${activeClass}" data-rule-id="${escapeHtml(rule.id)}"><div class="rule-card-header"><div class="rule-line"><strong>${escapeHtml(rule.name)}</strong><span>${escapeHtml(rule.type)}</span></div><button type="button" class="rule-select" data-rule-select="${escapeHtml(rule.id)}">Edit</button></div><div class="rule-meta"><small>${escapeHtml(formatRuleCondition(rule.condition))}</small><button type="button" class="rule-toggle" data-rule-toggle="${escapeHtml(rule.id)}">${rule.enabled ? "Disable" : "Enable"}</button></div><div class="rule-pills"><span class="pill muted">Priority ${escapeHtml(String(rule.priority))}</span>${rule.enabled ? "" : '<span class="pill muted">Disabled</span>'}</div>${renderRulePayloadPreview(rule)}</li>`;
        })
        .join("");

      return `<section class="rule-group"><div class="rule-group-head"><h4>${escapeHtml(formatRuleType(groupType as RuleType))}</h4><span class="group-count">${escapeHtml(String(groupRows.length))}</span></div><ul class="rule-group-list">${items}</ul></section>`;
    })
    .join("");
};

const groupRulesByType = (rows: RuleRow[]): Record<string, RuleRow[]> => {
  const grouped: Record<string, RuleRow[]> = {};

  for (const row of rows) {
    if (!grouped[row.type]) {
      grouped[row.type] = [];
    }

    grouped[row.type].push(row);
  }

  return grouped;
};

const populateEditor = (rule: RuleRow | null) => {
  if (!rule) {
    setEditorFieldsDisabled(true);
    ruleEditorCaptionEl.textContent = "Select a rule to preview and edit fields.";
    setEditorSaveStatus("Editor idle.", "neutral");
    return;
  }

  setEditorFieldsDisabled(false);
  ruleEditorCaptionEl.textContent = `Editing ${rule.name}`;

  editorNameEl.value = rule.name;
  editorTypeEl.value = rule.type;
  editorPriorityEl.value = String(rule.priority);
  editorMethodEl.value = rule.condition.method ?? "";
  editorEnabledEl.value = String(rule.enabled);
  editorUrlEl.value = rule.condition.urlContains ?? "";
  editorPayloadEl.value = JSON.stringify(rule.payload, null, 2);

  setEditorSaveStatus("Rule loaded. You can edit and save.", "neutral");
};

const setEditorFieldsDisabled = (disabled: boolean) => {
  editorNameEl.disabled = disabled;
  editorPriorityEl.disabled = disabled;
  editorMethodEl.disabled = disabled;
  editorEnabledEl.disabled = disabled;
  editorUrlEl.disabled = disabled;
  editorPayloadEl.disabled = disabled;
  editorSaveButtonEl.disabled = disabled;
};

const setEditorSaveStatus = (message: string, tone: "neutral" | "ok" | "error") => {
  editorSaveStatusEl.textContent = message;
  editorSaveStatusEl.classList.remove("ok", "error");

  if (tone === "ok") {
    editorSaveStatusEl.classList.add("ok");
    return;
  }

  if (tone === "error") {
    editorSaveStatusEl.classList.add("error");
  }
};

const readRuleValidation = (value: unknown): RuleValidation | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.timestamp !== "string" ||
    typeof candidate.passed !== "boolean" ||
    !Array.isArray(candidate.checks)
  ) {
    return null;
  }

  const checks = candidate.checks.filter(
    (check): check is RuleValidation["checks"][number] =>
      Boolean(
        check &&
          typeof check === "object" &&
          typeof (check as Record<string, unknown>).name === "string" &&
          typeof (check as Record<string, unknown>).passed === "boolean" &&
          typeof (check as Record<string, unknown>).details === "string"
      )
  );

  return {
    timestamp: candidate.timestamp,
    passed: candidate.passed,
    checks
  };
};

const isRequestRow = (value: unknown): value is RequestRow => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.method === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.timestamp === "string" &&
    Array.isArray(candidate.matchedRules) &&
    candidate.matchedRules.every(isMatchedRuleSummary)
  );
};

const isMatchedRuleSummary = (value: unknown): value is RequestRow["matchedRules"][number] => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.ruleId === "string" &&
    typeof candidate.ruleName === "string" &&
    typeof candidate.type === "string"
  );
};

const isRuleRow = (value: unknown): value is RuleRow => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    isRuleType(candidate.type) &&
    typeof candidate.enabled === "boolean" &&
    typeof candidate.priority === "number" &&
    typeof candidate.condition === "object" &&
    candidate.condition !== null &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
};

const isMockRule = (rule: RuleRow): rule is RuleRow & { type: "mock-response" | "mock-status" } =>
  rule.type === "mock-response" || rule.type === "mock-status";

const renderRulePayloadPreview = (rule: RuleRow): string => {
  if (rule.type !== "mock-response" && rule.type !== "mock-status") {
    return "";
  }

  const preview = JSON.stringify(rule.payload, null, 2) ?? "{}";

  return `<details class="payload-preview"><summary>Mock payload preview</summary><pre>${escapeHtml(preview)}</pre></details>`;
};

const isRuleType = (value: unknown): value is RuleType =>
  value === "rewrite-url" ||
  value === "rewrite-header" ||
  value === "rewrite-query" ||
  value === "rewrite-response" ||
  value === "rewrite-request-body" ||
  value === "block" ||
  value === "delay" ||
  value === "redirect" ||
  value === "mock-response" ||
  value === "mock-status";

const formatRuleType = (type: RuleType): string => {
  if (type === "rewrite-url") {
    return "Rewrite URL";
  }

  if (type === "rewrite-header") {
    return "Rewrite Header";
  }

  if (type === "rewrite-query") {
    return "Rewrite Query";
  }

  if (type === "rewrite-response") {
    return "Rewrite Response";
  }

  if (type === "rewrite-request-body") {
    return "Rewrite Request Body";
  }

  if (type === "mock-response") {
    return "Mock Response";
  }

  if (type === "mock-status") {
    return "Mock Status";
  }

  if (type === "block") {
    return "Block";
  }

  if (type === "delay") {
    return "Delay";
  }

  return "Redirect";
};

const formatRuleCondition = (condition: RuleRow["condition"]): string => {
  if (condition.method && condition.urlContains) {
    return `Method: ${condition.method} • URL contains: ${condition.urlContains}`;
  }

  if (condition.method) {
    return `Method: ${condition.method}`;
  }

  if (condition.urlContains) {
    return `URL contains: ${condition.urlContains}`;
  }

  return "Always on";
};

const renderRuleChips = (matchedRules: RequestRow["matchedRules"]): string => {
  if (matchedRules.length === 0) {
    return '<span class="rule-chip muted">No rules matched</span>';
  }

  return matchedRules
    .map((rule) => `<span class="rule-chip">${escapeHtml(rule.ruleName)}</span>`)
    .join("");
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleTimeString();
};

const formatDuration = (durationMs: number): string => `${durationMs} ms`;

const formatDateSlug = (): string => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
};

const triggerDownload = (filename: string, content: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildHar = (rows: RequestRow[]): object => {
  const entries = rows.map((row) => ({
    startedDateTime: row.timestamp,
    time: row.response?.durationMs ?? 0,
    request: {
      method: row.method,
      url: row.url,
      httpVersion: "HTTP/1.1",
      headers: [],
      queryString: [],
      cookies: [],
      headersSize: -1,
      bodySize: -1
    },
    response: {
      status: row.response?.status ?? 0,
      statusText: "",
      httpVersion: "HTTP/1.1",
      headers: [],
      cookies: [],
      content: { size: -1, mimeType: "application/json" },
      redirectURL: "",
      headersSize: -1,
      bodySize: -1
    },
    cache: {},
    timings: { send: 0, wait: row.response?.durationMs ?? 0, receive: 0 }
  }));

  return {
    log: {
      version: "1.2",
      creator: { name: "QA.Interceptor", version: "0.1.0" },
      entries
    }
  };
};

const buildEvidenceMarkdown = (session: HistorySession): string => {
  const lines: string[] = [
    `# QA Evidence — ${session.label}`,
    ``,
    `**Period:** ${formatTimestamp(session.startedAt)} → ${formatTimestamp(session.endedAt)}`,
    `**Requests:** ${session.requests.length}  |  **Failures:** ${session.failedCount}  |  **Pending:** ${session.pendingCount}`,
    ``,
    `## Timeline`,
    ``
  ];

  const sorted = session.requests
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const row of sorted) {
    const status = row.response ? String(row.response.status) : "Pending";
    const duration = row.response ? formatDuration(row.response.durationMs) : "-";
    const rules = row.matchedRules.map((r) => r.ruleName).join(", ") || "none";
    lines.push(`### ${row.method} ${row.url}`);
    lines.push(`- **Timestamp:** ${formatTimestamp(row.timestamp)}`);
    lines.push(`- **Status:** ${status}  |  **Duration:** ${duration}`);
    lines.push(`- **Matched rules:** ${rules}`);
    if (row.response?.body) {
      lines.push(`- **Response body:**`);
      lines.push(`\`\`\`json`);
      lines.push(row.response.body);
      lines.push(`\`\`\``);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Generated by QA.Interceptor on ${new Date().toISOString()}*`);

  return lines.join("\n");
};

const buildCurlCommand = (row: RequestRow): string => {
  const parts = [`curl -X ${row.method}`];

  for (const [key, value] of Object.entries(row.headers ?? {})) {
    parts.push(`  -H "${key}: ${value.replace(/"/g, '\\"')}"`);
  }

  parts.push(`  "${row.url}"`);

  return parts.join(" \\\n");
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");