const CAPTURED_REQUESTS_KEY = "capturedRequests";
const RULES_KEY = "rules";
const RULE_GROUPS_KEY = "ruleGroups";
const RULE_VALIDATION_KEY = "ruleValidation";
const RESPONSE_ASSERTIONS_KEY = "responseAssertions";

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
  headers: Record<string, string>;
  body?: string;
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
  groupId?: string;
  condition: {
    urlContains?: string;
    method?: string;
  };
  payload: Record<string, unknown>;
};

type RuleGroupRow = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  createdAt: string;
};

type MockTemplate = {
  id: string;
  name: string;
  description: string;
  method?: string;
  urlContains?: string;
  status?: number;
  delayMs?: number;
  headers?: Record<string, string>;
  body?: string;
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

type ResponseAssertionRow = {
  id: string;
  type: string;
  enabled: boolean;
  expected: unknown;
  path?: string;
  actual?: unknown;
  error?: string;
  createdAt: string;
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
const editorGroupEl = document.getElementById("editor-rule-group") as HTMLSelectElement | null;
const editorUrlEl = document.getElementById("editor-rule-url") as HTMLInputElement | null;
const editorPayloadEl = document.getElementById("editor-rule-payload") as HTMLTextAreaElement | null;
const editorSaveButtonEl = document.getElementById("editor-save-button") as HTMLButtonElement | null;
const rulesCreateButtonEl = document.getElementById("rules-create-button") as HTMLButtonElement | null;
const rulesGroupNameInputEl = document.getElementById("rules-group-name-input") as HTMLInputElement | null;
const rulesGroupCreateButtonEl = document.getElementById("rules-group-create-button") as HTMLButtonElement | null;
const rulesGroupsListEl = document.getElementById("rules-groups-list");
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
const networkExecutionLogEl = document.getElementById("network-execution-log");
const networkCloneRequestButtonEl = document.getElementById("network-clone-request-button") as HTMLButtonElement | null;
const networkEditResendButtonEl = document.getElementById("network-edit-resend-button") as HTMLButtonElement | null;
const networkRepeatRequestButtonEl = document.getElementById("network-repeat-request-button") as HTMLButtonElement | null;
const networkCopyCurlButtonEl = document.getElementById("network-copy-curl-button") as HTMLButtonElement | null;
const historyExportJsonButtonEl = document.getElementById("history-export-json-button") as HTMLButtonElement | null;
const historyExportMdButtonEl = document.getElementById("history-export-md-button") as HTMLButtonElement | null;
const assertionsAddButtonEl = document.getElementById("assertions-add-button") as HTMLButtonElement | null;
const responseAssertionsListEl = document.getElementById("response-assertions-list");
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
const mockTemplateSelectEl = document.getElementById("mock-template-select") as HTMLSelectElement | null;
const mockTemplateApplyButtonEl = document.getElementById("mock-template-apply-button") as HTMLButtonElement | null;
const mockTemplateDescriptionEl = document.getElementById("mock-template-description");
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
const networkComposeButtonEl = document.getElementById("network-compose-button") as HTMLButtonElement | null;
const networkComposePanelEl = document.getElementById("network-compose-panel") as HTMLElement | null;
const networkComposeMethodEl = document.getElementById("network-compose-method") as HTMLSelectElement | null;
const networkComposeUrlEl = document.getElementById("network-compose-url") as HTMLInputElement | null;
const networkComposeHeadersEl = document.getElementById("network-compose-headers") as HTMLTextAreaElement | null;
const networkComposeBodyEl = document.getElementById("network-compose-body") as HTMLTextAreaElement | null;
const networkComposeSendButtonEl = document.getElementById("network-compose-send-button") as HTMLButtonElement | null;
const networkComposeCloseButtonEl = document.getElementById("network-compose-close-button") as HTMLButtonElement | null;
const networkComposeStatusEl = document.getElementById("network-compose-status") as HTMLElement | null;
const networkImportHarButtonEl = document.getElementById("network-import-har-button") as HTMLButtonElement | null;
const networkImportHarInputEl = document.getElementById("network-import-har-input") as HTMLInputElement | null;
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
  !editorGroupEl ||
  !editorUrlEl ||
  !editorPayloadEl ||
  !editorSaveButtonEl ||
  !rulesCreateButtonEl ||
  !rulesGroupNameInputEl ||
  !rulesGroupCreateButtonEl ||
  !rulesGroupsListEl ||
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
  !networkExecutionLogEl ||
  !networkCloneRequestButtonEl ||
  !networkEditResendButtonEl ||
  !networkRepeatRequestButtonEl ||
  !networkCopyCurlButtonEl ||
  !historyExportJsonButtonEl ||
  !historyExportMdButtonEl ||
  !assertionsAddButtonEl ||
  !responseAssertionsListEl ||
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
  !mockTemplateSelectEl ||
  !mockTemplateApplyButtonEl ||
  !mockTemplateDescriptionEl ||
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
  !networkComposeButtonEl ||
  !networkComposePanelEl ||
  !networkComposeMethodEl ||
  !networkComposeUrlEl ||
  !networkComposeHeadersEl ||
  !networkComposeBodyEl ||
  !networkComposeSendButtonEl ||
  !networkComposeCloseButtonEl ||
  !networkComposeStatusEl ||
  !networkImportHarButtonEl ||
  !networkImportHarInputEl ||
  !networkExportHarButtonEl
) {
  throw new Error("Missing sidepanel UI element");
}

const workspaceTitle = workspaceTitleEl!;
const workspaceSubtitle = workspaceSubtitleEl!;

let currentRequests: RequestRow[] = [];
let currentRules: RuleRow[] = [];
let currentRuleGroups: RuleGroupRow[] = [];
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

let currentResponseAssertions: ResponseAssertionRow[] = [];

const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: "auth-401",
    name: "Auth 401 Unauthorized",
    description: "Simulate expired session/token and verify auth fallback UI.",
    method: "GET",
    urlContains: "/api",
    status: 401,
    headers: {
      "content-type": "application/json"
    },
    body: '{"error":"unauthorized","message":"Session expired"}'
  },
  {
    id: "server-500",
    name: "Server 500 with Retry Hint",
    description: "Simulate server failure path with retry guidance.",
    method: "POST",
    urlContains: "/api",
    status: 500,
    delayMs: 800,
    headers: {
      "content-type": "application/json"
    },
    body: '{"error":"internal_error","message":"Temporary failure"}'
  },
  {
    id: "validation-422",
    name: "Validation 422 Error",
    description: "Return field-level validation errors for form QA.",
    method: "POST",
    urlContains: "/api/orders",
    status: 422,
    headers: {
      "content-type": "application/json"
    },
    body: '{"error":"validation_failed","fields":{"email":"invalid format"}}'
  },
  {
    id: "slow-success",
    name: "Slow 200 Success",
    description: "Keep 200 response with latency to validate loading states.",
    method: "GET",
    urlContains: "/api",
    status: 200,
    delayMs: 1500,
    headers: {
      "content-type": "application/json"
    },
    body: '{"ok":true,"source":"template","items":[]}'
  }
];

const render = () => {
  renderRuleGroupsManager(currentRuleGroups);
  renderRules(currentRules);
  renderRequests(currentRequests);
  renderNetworkInspector(currentRequests);
  renderMockPlayground(currentRules);
  renderResponseAssertions(currentResponseAssertions);
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
  const stored = await chrome.storage.local.get([CAPTURED_REQUESTS_KEY, RULES_KEY, RULE_GROUPS_KEY, RULE_VALIDATION_KEY]);
  currentRequests = readRequestRows(stored[CAPTURED_REQUESTS_KEY]);
  currentRules = readRuleRows(stored[RULES_KEY]);
  currentRuleGroups = readRuleGroupRows(stored[RULE_GROUPS_KEY]);
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

  if (changes[RULE_GROUPS_KEY]) {
    currentRuleGroups = readRuleGroupRows(changes[RULE_GROUPS_KEY].newValue);
  }

  if (changes[RULE_VALIDATION_KEY]) {
    currentValidation = readRuleValidation(changes[RULE_VALIDATION_KEY].newValue);
  }

  if (changes[RESPONSE_ASSERTIONS_KEY]) {
    currentResponseAssertions = readResponseAssertionRows(changes[RESPONSE_ASSERTIONS_KEY].newValue);
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

rulesGroupCreateButtonEl.addEventListener("click", async () => {
  const name = rulesGroupNameInputEl.value.trim();

  if (!name) {
    setEditorSaveStatus("Group name is required.", "error");
    return;
  }

  const nextPriority =
    currentRuleGroups.length > 0 ? Math.max(...currentRuleGroups.map((group) => group.priority)) + 1 : 0;

  const nextGroup: RuleGroupRow = {
    id: createRuleGroupId(),
    name,
    enabled: true,
    priority: nextPriority,
    createdAt: new Date().toISOString()
  };

  const nextGroups = [...currentRuleGroups, nextGroup];
  currentRuleGroups = nextGroups;
  rulesGroupNameInputEl.value = "";
  await chrome.storage.local.set({ [RULE_GROUPS_KEY]: nextGroups });
  setEditorSaveStatus("Rule group created.", "ok");
});

rulesGroupsListEl.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement | null;
  const toggleButton = target?.closest("[data-group-toggle]") as HTMLButtonElement | null;
  const upButton = target?.closest("[data-group-up]") as HTMLButtonElement | null;
  const downButton = target?.closest("[data-group-down]") as HTMLButtonElement | null;
  const renameButton = target?.closest("[data-group-rename]") as HTMLButtonElement | null;
  const deleteButton = target?.closest("[data-group-delete]") as HTMLButtonElement | null;

  if (toggleButton) {
    const groupId = toggleButton.dataset.groupToggle;

    if (!groupId) {
      return;
    }

    const nextGroups = currentRuleGroups.map((group) =>
      group.id === groupId ? { ...group, enabled: !group.enabled } : group
    );
    currentRuleGroups = nextGroups;
    await chrome.storage.local.set({ [RULE_GROUPS_KEY]: nextGroups });
    return;
  }

  if (upButton || downButton) {
    const groupId = upButton?.dataset.groupUp ?? downButton?.dataset.groupDown;

    if (!groupId) {
      return;
    }

    const sorted = [...currentRuleGroups].sort((a, b) => a.priority - b.priority);
    const index = sorted.findIndex((group) => group.id === groupId);

    if (index < 0) {
      return;
    }

    const targetIndex = upButton ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= sorted.length) {
      return;
    }

    const [moved] = sorted.splice(index, 1);
    sorted.splice(targetIndex, 0, moved);

    const nextGroups = sorted.map((group, order) => ({ ...group, priority: order }));
    currentRuleGroups = nextGroups;
    await chrome.storage.local.set({ [RULE_GROUPS_KEY]: nextGroups });
    return;
  }

  if (renameButton) {
    const groupId = renameButton.dataset.groupRename;

    if (!groupId) {
      return;
    }

    const current = currentRuleGroups.find((group) => group.id === groupId);

    if (!current) {
      return;
    }

    const renamed = window.prompt("Rename group", current.name)?.trim();

    if (!renamed) {
      return;
    }

    const nextGroups = currentRuleGroups.map((group) =>
      group.id === groupId ? { ...group, name: renamed } : group
    );
    currentRuleGroups = nextGroups;
    await chrome.storage.local.set({ [RULE_GROUPS_KEY]: nextGroups });
    return;
  }

  if (!deleteButton) {
    return;
  }

  const groupId = deleteButton.dataset.groupDelete;

  if (!groupId) {
    return;
  }

  const inUseCount = currentRules.filter((rule) => rule.groupId === groupId).length;

  if (inUseCount > 0) {
    setEditorSaveStatus("Cannot delete a group that still has rules assigned.", "error");
    return;
  }

  const nextGroups = currentRuleGroups.filter((group) => group.id !== groupId);
  currentRuleGroups = nextGroups.map((group, order) => ({ ...group, priority: order }));
  await chrome.storage.local.set({ [RULE_GROUPS_KEY]: currentRuleGroups });
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

networkComposeButtonEl.addEventListener("click", () => {
  const shouldOpen = networkComposePanelEl.classList.contains("hidden");

  if (!shouldOpen) {
    networkComposePanelEl.classList.add("hidden");
    return;
  }

  const selectedRow = currentRequests.find((requestRow) => requestRow.id === selectedNetworkRequestId);

  if (selectedRow) {
    fillComposeFromRequest(selectedRow);
  } else {
    networkComposeMethodEl.value = "GET";
    networkComposeUrlEl.value = "";
    networkComposeHeadersEl.value = "{}";
    networkComposeBodyEl.value = "";
    setNetworkComposeStatus("Compose panel ready.", "neutral");
  }

  networkComposePanelEl.classList.remove("hidden");
});

networkCloneRequestButtonEl.addEventListener("click", () => {
  const selectedRow = currentRequests.find((requestRow) => requestRow.id === selectedNetworkRequestId);

  if (!selectedRow) {
    setNetworkComposeStatus("Select a request before cloning.", "error");
    return;
  }

  fillComposeFromRequest(selectedRow);
  networkComposePanelEl.classList.remove("hidden");
});

networkEditResendButtonEl.addEventListener("click", () => {
  const selectedRow = currentRequests.find((requestRow) => requestRow.id === selectedNetworkRequestId);

  if (!selectedRow) {
    setNetworkComposeStatus("Select a request before editing/resending.", "error");
    return;
  }

  fillComposeFromRequest(selectedRow);
  setNetworkComposeStatus("Editing cloned request. Update fields and click Send Request.", "ok");
  networkComposePanelEl.classList.remove("hidden");
});

networkComposeCloseButtonEl.addEventListener("click", () => {
  networkComposePanelEl.classList.add("hidden");
  setNetworkComposeStatus("Compose panel closed.", "neutral");
});

networkComposeSendButtonEl.addEventListener("click", async () => {
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
        Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)])
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

  try {
    const response = await chrome.runtime.sendMessage({
      type: "REPEAT_REQUEST",
      payload: {
        method,
        url,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
        ...(body.trim() ? { body } : {})
      }
    });

    if (response?.ok) {
      setNetworkComposeStatus(
        `Request sent successfully${typeof response.status === "number" ? ` (status ${String(response.status)}).` : "."}`,
        "ok"
      );
      networkComposePanelEl.classList.add("hidden");
    } else {
      setNetworkComposeStatus(response?.error ? `Request failed: ${String(response.error)}` : "Request failed.", "error");
    }
  } catch {
    setNetworkComposeStatus("Request failed due to runtime error.", "error");
  }

  networkComposeSendButtonEl.textContent = originalLabel;
  networkComposeSendButtonEl.disabled = false;
});

networkImportHarButtonEl.addEventListener("click", () => {
  networkImportHarInputEl.value = "";
  networkImportHarInputEl.click();
});

networkImportHarInputEl.addEventListener("change", async () => {
  const file = networkImportHarInputEl.files?.[0];

  if (!file) {
    return;
  }

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

  const merged = [...importedRows, ...currentRequests]
    .slice(0, 100)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  currentRequests = merged;
  selectedNetworkRequestId = merged[0]?.id ?? null;
  await chrome.storage.local.set({ [CAPTURED_REQUESTS_KEY]: merged });
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

networkRepeatRequestButtonEl.addEventListener("click", async () => {
  const row = currentRequests.find((requestRow) => requestRow.id === selectedNetworkRequestId);

  if (!row) {
    return;
  }

  const originalLabel = networkRepeatRequestButtonEl.textContent;
  networkRepeatRequestButtonEl.textContent = "Replaying...";
  networkRepeatRequestButtonEl.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "REPEAT_REQUEST",
      payload: {
        method: row.method,
        url: row.url,
        headers: row.headers,
        body: row.body
      }
    });

    networkRepeatRequestButtonEl.textContent = response?.ok ? "Repeated" : "Replay failed";
  } catch {
    networkRepeatRequestButtonEl.textContent = "Replay failed";
  }

  setTimeout(() => {
    networkRepeatRequestButtonEl.textContent = originalLabel;
    networkRepeatRequestButtonEl.disabled = false;
  }, 1800);
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

mockTemplateSelectEl.addEventListener("change", () => {
  const template = MOCK_TEMPLATES.find((item) => item.id === mockTemplateSelectEl.value);
  mockTemplateDescriptionEl.textContent = template
    ? template.description
    : "Choose a template to auto-fill mock fields.";
});

mockTemplateApplyButtonEl.addEventListener("click", () => {
  const template = MOCK_TEMPLATES.find((item) => item.id === mockTemplateSelectEl.value);

  if (!template) {
    setMockSaveStatus("Select a template before applying.", "error");
    return;
  }

  if (!selectedMockRuleId) {
    setMockSaveStatus("Select a mock rule before applying a template.", "error");
    return;
  }

  if (template.method !== undefined) {
    mockEditorMethodEl.value = template.method;
  }

  if (template.urlContains !== undefined) {
    mockEditorUrlEl.value = template.urlContains;
  }

  if (template.status !== undefined) {
    mockEditorHttpStatusEl.value = String(template.status);
  }

  if (template.delayMs !== undefined) {
    mockEditorDelayMsEl.value = String(template.delayMs);
  }

  if (template.headers) {
    mockEditorHeadersEl.value = JSON.stringify(template.headers, null, 2);
  }

  if (!mockEditorBodyEl.disabled && template.body !== undefined) {
    mockEditorBodyEl.value = template.body;
  }

  setMockSaveStatus(`Template applied: ${template.name}. Save to persist.`, "ok");
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

for (const field of [editorNameEl, editorPriorityEl, editorMethodEl, editorEnabledEl, editorGroupEl, editorUrlEl, editorPayloadEl]) {
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
  const groupValue = editorGroupEl.value.trim();
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
      ...(groupValue ? { groupId: groupValue } : { groupId: undefined }),
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

// Response Assertions Event Listeners
assertionsAddButtonEl.addEventListener("click", () => {
  const newAssertion: ResponseAssertionRow = {
    id: `assertion-${Date.now()}`,
    type: "status",
    enabled: true,
    expected: 200,
    createdAt: new Date().toISOString(),
  };

  currentResponseAssertions = [newAssertion, ...currentResponseAssertions];
  renderResponseAssertions(currentResponseAssertions);
  chrome.storage.local.set({ RESPONSE_ASSERTIONS_KEY: currentResponseAssertions });
});

responseAssertionsListEl.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement | null;
  const toggleButton = target?.closest("[data-assertion-toggle]") as HTMLButtonElement | null;
  const deleteButton = target?.closest("[data-assertion-delete]") as HTMLButtonElement | null;

  if (toggleButton) {
    const assertionId = toggleButton.dataset.assertionToggle;

    if (!assertionId) {
      return;
    }

    const assertion = currentResponseAssertions.find((row) => row.id === assertionId);

    if (assertion) {
      assertion.enabled = !assertion.enabled;
      renderResponseAssertions(currentResponseAssertions);
      await chrome.storage.local.set({ RESPONSE_ASSERTIONS_KEY: currentResponseAssertions });
    }

    return;
  }

  if (!deleteButton) {
    return;
  }

  const assertionId = deleteButton.dataset.assertionDelete;

  if (!assertionId) {
    return;
  }

  const nextRows = currentResponseAssertions.filter((row) => row.id !== assertionId);
  currentResponseAssertions = nextRows;
  await chrome.storage.local.set({ RESPONSE_ASSERTIONS_KEY: nextRows });
  renderResponseAssertions(currentResponseAssertions);
});

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
initializeMockTemplates();

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

const readRuleGroupRows = (value: unknown): RuleGroupRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRuleGroupRow);
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
    networkExecutionLogEl.innerHTML = '<li class="placeholder">Select a request to inspect execution timeline.</li>';
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
  networkExecutionLogEl.innerHTML = renderNetworkExecutionTimeline(row);
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

const createRuleGroupId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `grp-${crypto.randomUUID()}`;
  }

  return `grp-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

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
  mockTemplateSelectEl.disabled = disabled;
  mockTemplateApplyButtonEl.disabled = disabled;
  mockSaveButtonEl.disabled = disabled;
};

function initializeMockTemplates() {
  const templateSelect = mockTemplateSelectEl!;
  const templateDescription = mockTemplateDescriptionEl!;

  templateSelect.innerHTML = ['<option value="">Select a template</option>']
    .concat(
      MOCK_TEMPLATES.map(
        (template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`
      )
    )
    .join("");

  templateDescription.textContent = "Choose a template to auto-fill mock fields.";
}

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

const renderNetworkExecutionTimeline = (row: RequestRow): string => {
  const entries: Array<{ title: string; details: string; timestamp: string }> = [
    {
      title: `${row.method} request captured`,
      details: row.url,
      timestamp: row.timestamp
    }
  ];

  for (const matched of row.matchedRules) {
    entries.push({
      title: `Matched rule: ${matched.ruleName}`,
      details: summarizeRuleAction(matched.type),
      timestamp: row.timestamp
    });
  }

  if (row.response) {
    entries.push({
      title: `Response completed (${row.response.status})`,
      details: `Finished in ${formatDuration(row.response.durationMs)}`,
      timestamp: row.response.timestamp
    });
  } else {
    entries.push({
      title: "Response pending",
      details: "Waiting for completion from browser runtime.",
      timestamp: row.timestamp
    });
  }

  return entries
    .map(
      (entry) =>
        `<li class="network-execution-item"><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(formatTimestamp(entry.timestamp))}</small><small>${escapeHtml(entry.details)}</small></li>`
    )
    .join("");
};

const summarizeRuleAction = (type: string): string => {
  if (type === "rewrite-url") {
    return "Action: URL rewritten before request dispatch.";
  }

  if (type === "rewrite-header") {
    return "Action: request headers adjusted by rewrite operations.";
  }

  if (type === "rewrite-query") {
    return "Action: query string modified by rule operations.";
  }

  if (type === "rewrite-response") {
    return "Action: synthetic response body returned for matched request.";
  }

  if (type === "rewrite-request-body") {
    return "Action: request body transformed before fetch execution.";
  }

  if (type === "mock-response") {
    return "Action: mocked response payload served to caller.";
  }

  if (type === "mock-status") {
    return "Action: mocked HTTP status code applied.";
  }

  if (type === "delay") {
    return "Action: request delayed to simulate network latency.";
  }

  if (type === "redirect") {
    return "Action: request redirected to configured destination.";
  }

  if (type === "block") {
    return "Action: request blocked by interception rule.";
  }

  return "Action: rule matched and applied in runtime pipeline.";
};

const isNetworkStatusFilter = (value: string): value is NetworkStatusFilter =>
  value === "all" ||
  value === "pending" ||
  value === "2xx" ||
  value === "3xx" ||
  value === "4xx" ||
  value === "5xx";

const renderRuleGroups = (rows: RuleRow[]): string => {
  const groups = groupRulesByGroup(rows, currentRuleGroups);

  return Object.entries(groups)
    .map(([groupType, groupRows]) => {
      const items = groupRows
        .map((rule) => {
          const activeClass = selectedRuleId === rule.id ? " active" : "";

          return `<li class="rule-card${activeClass}" data-rule-id="${escapeHtml(rule.id)}"><div class="rule-card-header"><div class="rule-line"><strong>${escapeHtml(rule.name)}</strong><span>${escapeHtml(rule.type)}</span></div><button type="button" class="rule-select" data-rule-select="${escapeHtml(rule.id)}">Edit</button></div><div class="rule-meta"><small>${escapeHtml(formatRuleCondition(rule.condition))}</small><button type="button" class="rule-toggle" data-rule-toggle="${escapeHtml(rule.id)}">${rule.enabled ? "Disable" : "Enable"}</button></div><div class="rule-pills"><span class="pill muted">Priority ${escapeHtml(String(rule.priority))}</span>${rule.enabled ? "" : '<span class="pill muted">Disabled</span>'}</div>${renderRulePayloadPreview(rule)}</li>`;
        })
        .join("");

      return `<section class="rule-group"><div class="rule-group-head"><h4>${escapeHtml(groupType)}</h4><span class="group-count">${escapeHtml(String(groupRows.length))}</span></div><ul class="rule-group-list">${items}</ul></section>`;
    })
    .join("");
};

const groupRulesByGroup = (rows: RuleRow[], groups: RuleGroupRow[]): Record<string, RuleRow[]> => {
  const labels = new Map(groups.map((group) => [group.id, group.name] as const));
  const priorities = new Map(groups.map((group) => [group.id, group.priority] as const));
  const grouped: Record<string, RuleRow[]> = {};

  const sortedRows = [...rows].sort((a, b) => {
    const left = a.groupId ? priorities.get(a.groupId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const right = b.groupId ? priorities.get(b.groupId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;

    if (left !== right) {
      return left - right;
    }

    return a.priority - b.priority;
  });

  for (const row of sortedRows) {
    const key = row.groupId ? labels.get(row.groupId) ?? "Ungrouped" : "Ungrouped";

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(row);
  }

  return grouped;
};

const renderRuleGroupsManager = (groups: RuleGroupRow[]) => {
  if (groups.length === 0) {
    rulesGroupsListEl.innerHTML = '<li class="placeholder">No groups yet.</li>';
    editorGroupEl.innerHTML = '<option value="">Ungrouped</option>';
    return;
  }

  const ordered = [...groups].sort((a, b) => a.priority - b.priority);

  rulesGroupsListEl.innerHTML = ordered
    .map(
      (group, index) =>
        `<li class="rules-group-row"><div><strong>${escapeHtml(group.name)}</strong><small class="pill muted">Priority ${escapeHtml(String(group.priority))}</small>${group.enabled ? "" : '<small class="pill muted">Disabled</small>'}</div><div class="rules-group-actions"><button type="button" class="action-btn" data-group-up="${escapeHtml(group.id)}" ${index === 0 ? "disabled" : ""}>Up</button><button type="button" class="action-btn" data-group-down="${escapeHtml(group.id)}" ${index === ordered.length - 1 ? "disabled" : ""}>Down</button><button type="button" class="action-btn" data-group-toggle="${escapeHtml(group.id)}">${group.enabled ? "Disable" : "Enable"}</button><button type="button" class="action-btn" data-group-rename="${escapeHtml(group.id)}">Rename</button><button type="button" class="action-btn danger" data-group-delete="${escapeHtml(group.id)}">Delete</button></div></li>`
    )
    .join("");

  editorGroupEl.innerHTML = ['<option value="">Ungrouped</option>']
    .concat(
      ordered.map(
        (group) =>
          `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}${group.enabled ? "" : " (Disabled)"}</option>`
      )
    )
    .join("");
};

const renderResponseAssertions = (assertions: ResponseAssertionRow[]): void => {
  if (assertions.length === 0) {
    responseAssertionsListEl.innerHTML = '<li class="placeholder">No assertions added. Add one to validate responses.</li>';
    return;
  }

  responseAssertionsListEl.innerHTML = assertions
    .map((assertion) => {
      const statusClass = assertion.error ? "error" : assertion.actual !== undefined ? "ok" : "pending";
      const statusIcon = assertion.error ? "❌" : assertion.actual !== undefined ? "✓" : "○";
      const typeLabel = `${assertion.type}${assertion.path ? ` (${assertion.path})` : ""}`;
      const expectedText = `Expected: ${String(assertion.expected)}`;
      const actualText = assertion.actual !== undefined ? `Actual: ${String(assertion.actual)}` : "Not validated yet";
      const errorText = assertion.error ? `Error: ${assertion.error}` : "";

      return `<li class="response-assertion-item ${statusClass}">
        <div class="assertion-header">
          <span class="status-icon">${statusIcon}</span>
          <span class="assertion-type">${escapeHtml(typeLabel)}</span>
        </div>
        <div class="assertion-values">
          <small>${escapeHtml(expectedText)}</small>
          ${actualText ? `<small>${escapeHtml(actualText)}</small>` : ""}
          ${errorText ? `<small class="error-text">${escapeHtml(errorText)}</small>` : ""}
        </div>
        <div class="assertion-actions">
          <button type="button" class="icon-btn" data-assertion-toggle="${escapeHtml(assertion.id)}" title="Toggle assertion">
            ${assertion.enabled ? "✓" : "○"}
          </button>
          <button type="button" class="icon-btn danger" data-assertion-delete="${escapeHtml(assertion.id)}" title="Delete assertion">
            ✕
          </button>
        </div>
      </li>`;
    })
    .join("");
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
  editorGroupEl.value = rule.groupId ?? "";
  editorUrlEl.value = rule.condition.urlContains ?? "";
  editorPayloadEl.value = JSON.stringify(rule.payload, null, 2);

  setEditorSaveStatus("Rule loaded. You can edit and save.", "neutral");
};

const setEditorFieldsDisabled = (disabled: boolean) => {
  editorNameEl.disabled = disabled;
  editorPriorityEl.disabled = disabled;
  editorMethodEl.disabled = disabled;
  editorEnabledEl.disabled = disabled;
  editorGroupEl.disabled = disabled;
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

const setNetworkComposeStatus = (message: string, tone: "neutral" | "ok" | "error") => {
  networkComposeStatusEl.textContent = message;
  networkComposeStatusEl.classList.remove("ok", "error");

  if (tone === "ok") {
    networkComposeStatusEl.classList.add("ok");
    return;
  }

  if (tone === "error") {
    networkComposeStatusEl.classList.add("error");
  }
};

const fillComposeFromRequest = (row: RequestRow) => {
  networkComposeMethodEl.value = row.method;
  networkComposeUrlEl.value = row.url;
  networkComposeHeadersEl.value = JSON.stringify(row.headers ?? {}, null, 2);
  networkComposeBodyEl.value = row.body ?? "";
  setNetworkComposeStatus("Compose pre-filled from selected request.", "ok");
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
    typeof candidate.headers === "object" &&
    candidate.headers !== null &&
    (candidate.body === undefined || typeof candidate.body === "string") &&
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
    (candidate.groupId === undefined || typeof candidate.groupId === "string") &&
    typeof candidate.condition === "object" &&
    candidate.condition !== null &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
};

const isRuleGroupRow = (value: unknown): value is RuleGroupRow => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.enabled === "boolean" &&
    typeof candidate.priority === "number" &&
    typeof candidate.createdAt === "string"
  );
};

const isResponseAssertionRow = (value: unknown): value is ResponseAssertionRow => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    (candidate.type === "status" || candidate.type === "header" || candidate.type === "json-path" || candidate.type === "body-contains") &&
    typeof candidate.enabled === "boolean" &&
    candidate.expected !== undefined &&
    (candidate.path === undefined || typeof candidate.path === "string") &&
    (candidate.actual === undefined || typeof candidate.actual === "string" || typeof candidate.actual === "number") &&
    (candidate.error === undefined || typeof candidate.error === "string") &&
    typeof candidate.createdAt === "string"
  );
};

const readResponseAssertionRows = (value: unknown): ResponseAssertionRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isResponseAssertionRow);
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

const readHarAsRequestRows = (value: unknown): RequestRow[] => {
  if (!value || typeof value !== "object") {
    return [];
  }

  const root = value as Record<string, unknown>;
  const log = root.log;

  if (!log || typeof log !== "object") {
    return [];
  }

  const entries = (log as Record<string, unknown>).entries;

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => harEntryToRequestRow(entry, index))
    .filter((row): row is RequestRow => Boolean(row));
};

const harEntryToRequestRow = (entry: unknown, index: number): RequestRow | null => {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const candidate = entry as Record<string, unknown>;
  const request = candidate.request as Record<string, unknown> | undefined;
  const response = candidate.response as Record<string, unknown> | undefined;

  if (!request || typeof request !== "object") {
    return null;
  }

  const method = typeof request.method === "string" ? request.method.toUpperCase() : "GET";
  const url = typeof request.url === "string" ? request.url : "";

  if (!url) {
    return null;
  }

  const started =
    typeof candidate.startedDateTime === "string" ? candidate.startedDateTime : new Date().toISOString();
  const time = typeof candidate.time === "number" && Number.isFinite(candidate.time) ? candidate.time : 0;

  const headers = readHarHeaders(request.headers);
  const responseBody = readHarResponseBody(response);
  const status = response && typeof response.status === "number" ? response.status : 0;

  return {
    id: `har-${Date.now()}-${index}`,
    method,
    url,
    headers,
    timestamp: started,
    captureSource: "network",
    resourceType: "xmlhttprequest",
    tabId: -1,
    matchedRules: [],
    response: {
      status,
      durationMs: Math.max(0, Math.round(time)),
      timestamp: started,
      ...(responseBody ? { body: responseBody } : {})
    }
  };
};

const readHarHeaders = (value: unknown): Record<string, string> => {
  if (!Array.isArray(value)) {
    return {};
  }

  const pairs = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const header = item as Record<string, unknown>;
      if (typeof header.name !== "string" || typeof header.value !== "string") {
        return null;
      }

      return [header.name.toLowerCase(), header.value] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  return Object.fromEntries(pairs);
};

const readHarResponseBody = (response: Record<string, unknown> | undefined): string | undefined => {
  if (!response) {
    return undefined;
  }

  const content = response.content;
  if (!content || typeof content !== "object") {
    return undefined;
  }

  const text = (content as Record<string, unknown>).text;
  return typeof text === "string" ? text : undefined;
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