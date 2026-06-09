const CAPTURED_REQUESTS_KEY = "capturedRequests";
const RULES_KEY = "rules";

type RequestRow = {
  id: string;
  method: string;
  url: string;
  timestamp: string;
  matchedRules: Array<{
    ruleId: string;
    ruleName: string;
    type: string;
  }>;
  response?: {
    status: number;
    durationMs: number;
    timestamp: string;
  };
};

type RuleRow = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  condition: {
    urlContains?: string;
    method?: string;
  };
};

const listEl = document.getElementById("request-list");
const rulesListEl = document.getElementById("rules-list");
const rulesStatsEl = document.getElementById("rules-stats");

if (!listEl) {
  throw new Error("Missing request list element");
}

if (!rulesListEl || !rulesStatsEl) {
  throw new Error("Missing rules list element");
}

let currentRequests: RequestRow[] = [];
let currentRules: RuleRow[] = [];

const render = () => {
  renderRules(currentRules);
  renderRequests(currentRequests);
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

  if (rows.length === 0) {
    rulesListEl.innerHTML = '<li class="placeholder">No rules configured yet.</li>';
    return;
  }

  rulesListEl.innerHTML = rows
    .map(
      (rule) =>
        `<li class="rule-card" data-rule-id="${escapeHtml(rule.id)}"><div class="rule-line"><strong>${escapeHtml(rule.name)}</strong><span>${escapeHtml(rule.type)}</span></div><div class="rule-meta"><small>${escapeHtml(formatRuleCondition(rule.condition))}</small><button type="button" class="rule-toggle" data-rule-toggle="${escapeHtml(rule.id)}">${rule.enabled ? "Disable" : "Enable"}</button></div></li>`
    )
    .join("");
};

const loadCapturedRequests = async () => {
  const stored = await chrome.storage.local.get([CAPTURED_REQUESTS_KEY, RULES_KEY]);
  currentRequests = readRequestRows(stored[CAPTURED_REQUESTS_KEY]);
  currentRules = readRuleRows(stored[RULES_KEY]);
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

  render();
});

rulesListEl.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement | null;
  const toggleButton = target?.closest("[data-rule-toggle]") as HTMLButtonElement | null;

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

void loadCapturedRequests();

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
    typeof candidate.type === "string" &&
    typeof candidate.enabled === "boolean" &&
    typeof candidate.priority === "number" &&
    typeof candidate.condition === "object"
  );
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

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");