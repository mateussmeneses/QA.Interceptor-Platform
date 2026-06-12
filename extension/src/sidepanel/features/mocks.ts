/**
 * Mocks feature module.
 * Manages the mock playground: rule list, editor, templates, and env-var preview.
 */

import type { AppState, RuleRow, MockTypeFilter, MockStatusFilter, MockTemplate, HttpMethod } from "../shared/types";
import { isMockRule } from "../shared/types";
import {
  escapeHtml,
  formatRuleType,
  formatRuleCondition,
  generateId,
} from "../shared/utils";
import { saveRules } from "../../storage/index";

// ---------------------------------------------------------------------------
// Template library
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: "auth-401",
    name: "Auth 401 Unauthorized",
    description: "Simulate expired session/token and verify auth fallback UI.",
    method: "GET",
    urlContains: "/api",
    status: 401,
    headers: { "content-type": "application/json" },
    body: '{"error":"unauthorized","message":"Session expired"}',
  },
  {
    id: "server-500",
    name: "Server 500 with Retry Hint",
    description: "Simulate server failure path with retry guidance.",
    method: "POST",
    urlContains: "/api",
    status: 500,
    delayMs: 800,
    headers: { "content-type": "application/json" },
    body: '{"error":"internal_error","message":"Temporary failure"}',
  },
  {
    id: "validation-422",
    name: "Validation 422 Error",
    description: "Return field-level validation errors for form QA.",
    method: "POST",
    urlContains: "/api/orders",
    status: 422,
    headers: { "content-type": "application/json" },
    body: '{"error":"validation_failed","fields":{"email":"invalid format"}}',
  },
  {
    id: "slow-success",
    name: "Slow 200 Success",
    description: "Keep 200 response with latency to validate loading states.",
    method: "GET",
    urlContains: "/api",
    status: 200,
    delayMs: 1500,
    headers: { "content-type": "application/json" },
    body: '{"ok":true,"source":"template","items":[]}',
  },
];

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

let mockRuleListEl: HTMLElement;
let mockEmptyStateEl: HTMLElement;
let mockSearchEl: HTMLInputElement;
let mockTypeFilterEl: HTMLSelectElement;
let mockStatusFilterEl: HTMLSelectElement;
let mockEditorCaptionEl: HTMLElement;
let mockEditorFormEl: HTMLFormElement;
let mockSaveStatusEl: HTMLElement;
let mockEditorEnabledEl: HTMLSelectElement;
let mockEditorMethodEl: HTMLSelectElement;
let mockEditorUrlEl: HTMLInputElement;
let mockEditorHttpStatusEl: HTMLInputElement;
let mockEditorDelayMsEl: HTMLInputElement;
let mockEditorHeadersEl: HTMLTextAreaElement;
let mockEditorBodyEl: HTMLTextAreaElement;
let mockTemplateSelectEl: HTMLSelectElement;
let mockTemplateApplyButtonEl: HTMLButtonElement;
let mockTemplateDescriptionEl: HTMLElement;
let mockSaveButtonEl: HTMLButtonElement;

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

let _state: AppState = { requests: [], rules: [], ruleGroups: [], validation: null, assertions: [] };
let selectedMockRuleId: string | null = null;
let mockSearchQuery = "";
let mockTypeFilter: MockTypeFilter = "all";
let mockStatusFilter: MockStatusFilter = "all";

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initMocks(): void {
  const getEl = (id: string): HTMLElement => {
    const el = document.getElementById(id);

    if (!el) {
      throw new Error(`Mocks feature: missing element #${id}`);
    }

    return el;
  };

  mockRuleListEl = getEl("mock-rule-list");
  mockEmptyStateEl = getEl("mock-empty-state");
  mockSearchEl = getEl("mock-search") as HTMLInputElement;
  mockTypeFilterEl = getEl("mock-type-filter") as HTMLSelectElement;
  mockStatusFilterEl = getEl("mock-status-filter") as HTMLSelectElement;
  mockEditorCaptionEl = getEl("mock-editor-caption");
  mockEditorFormEl = getEl("mock-editor-form") as HTMLFormElement;
  mockSaveStatusEl = getEl("mock-save-status");
  mockEditorEnabledEl = getEl("mock-editor-enabled") as HTMLSelectElement;
  mockEditorMethodEl = getEl("mock-editor-method") as HTMLSelectElement;
  mockEditorUrlEl = getEl("mock-editor-url") as HTMLInputElement;
  mockEditorHttpStatusEl = getEl("mock-editor-http-status") as HTMLInputElement;
  mockEditorDelayMsEl = getEl("mock-editor-delay-ms") as HTMLInputElement;
  mockEditorHeadersEl = getEl("mock-editor-headers") as HTMLTextAreaElement;
  mockEditorBodyEl = getEl("mock-editor-body") as HTMLTextAreaElement;
  mockTemplateSelectEl = getEl("mock-template-select") as HTMLSelectElement;
  mockTemplateApplyButtonEl = getEl("mock-template-apply-button") as HTMLButtonElement;
  mockTemplateDescriptionEl = getEl("mock-template-description");
  mockSaveButtonEl = getEl("mock-save-button") as HTMLButtonElement;

  populateTemplateDropdown();
  bindEvents();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderMocks(state: AppState): void {
  _state = state;
  renderMockPlayground(state.rules);
}

const renderMockPlayground = (rows: RuleRow[]): void => {
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
      const statusLabel = String(rule.payload.status ?? 200);

      return `<li class="mock-rule-card${activeClass}" data-mock-rule-id="${escapeHtml(rule.id)}"><div class="mock-rule-top"><div><strong>${escapeHtml(rule.name)}</strong><div class="mock-rule-url">${escapeHtml(rule.condition.urlContains ?? "Any URL")}</div></div><button type="button" class="rule-select" data-mock-select="${escapeHtml(rule.id)}">Edit</button></div><div class="mock-rule-meta"><span class="pill muted">${escapeHtml(formatRuleType(rule.type))}</span><span class="pill muted">Status ${escapeHtml(statusLabel)}</span>${rule.enabled ? "" : '<span class="pill muted">Disabled</span>'}</div><div class="rule-meta"><small>${escapeHtml(formatRuleCondition(rule.condition))}</small><button type="button" class="rule-toggle" data-mock-toggle="${escapeHtml(rule.id)}">${rule.enabled ? "Disable" : "Enable"}</button></div></li>`;
    })
    .join("");

  const selectedRule =
    filteredRows.find((rule) => rule.id === selectedMockRuleId) ?? null;
  populateMockEditor(selectedRule);
};

const populateMockEditor = (rule: RuleRow | null): void => {
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

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

const populateTemplateDropdown = (): void => {
  mockTemplateSelectEl.innerHTML = ['<option value="">Select a template</option>']
    .concat(
      MOCK_TEMPLATES.map(
        (t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`
      )
    )
    .join("");

  mockTemplateDescriptionEl.textContent = "Choose a template to auto-fill mock fields.";
};

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------

const bindEvents = (): void => {
  mockSearchEl.addEventListener("input", () => {
    mockSearchQuery = mockSearchEl.value.trim().toLowerCase();
    renderMockPlayground(_state.rules);
  });

  mockTypeFilterEl.addEventListener("change", () => {
    const candidate = mockTypeFilterEl.value;
    mockTypeFilter =
      candidate === "mock-response" || candidate === "mock-status" ? candidate : "all";
    renderMockPlayground(_state.rules);
  });

  mockStatusFilterEl.addEventListener("change", () => {
    const candidate = mockStatusFilterEl.value;
    mockStatusFilter = candidate === "enabled" || candidate === "disabled" ? candidate : "all";
    renderMockPlayground(_state.rules);
  });

  mockRuleListEl.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const selectButton = target?.closest("[data-mock-select]") as HTMLButtonElement | null;
    const toggleButton = target?.closest("[data-mock-toggle]") as HTMLButtonElement | null;

    if (selectButton) {
      const ruleId = selectButton.dataset.mockSelect;

      if (ruleId) {
        selectedMockRuleId = ruleId;
        renderMockPlayground(_state.rules);
      }

      return;
    }

    if (!toggleButton) {
      return;
    }

    const ruleId = toggleButton.dataset.mockToggle;

    if (!ruleId) {
      return;
    }

    const nextRules = _state.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );

    void saveRules(nextRules);
  });

  mockTemplateSelectEl.addEventListener("change", () => {
    const template = MOCK_TEMPLATES.find((t) => t.id === mockTemplateSelectEl.value);
    mockTemplateDescriptionEl.textContent = template
      ? template.description
      : "Choose a template to auto-fill mock fields.";
  });

  mockTemplateApplyButtonEl.addEventListener("click", () => {
    const template = MOCK_TEMPLATES.find((t) => t.id === mockTemplateSelectEl.value);

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

  for (const field of [
    mockEditorEnabledEl,
    mockEditorMethodEl,
    mockEditorUrlEl,
    mockEditorHttpStatusEl,
    mockEditorDelayMsEl,
    mockEditorHeadersEl,
    mockEditorBodyEl,
  ]) {
    field.addEventListener("input", () => {
      if (selectedMockRuleId) {
        setMockSaveStatus("Unsaved mock changes.", "neutral");
      }
    });
  }

  mockEditorFormEl.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!selectedMockRuleId) {
      setMockSaveStatus("Select a mock rule before saving.", "error");
      return;
    }

    const currentRule = _state.rules.find(
      (rule) => rule.id === selectedMockRuleId && isMockRule(rule)
    );

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
    const nextDelay =
      Number.isFinite(nextDelayRaw) && nextDelayRaw > 0 ? nextDelayRaw : 0;

    let nextHeaders: Record<string, string> = {};

    if (mockEditorHeadersEl.value.trim()) {
      try {
        const parsed = JSON.parse(mockEditorHeadersEl.value);

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setMockSaveStatus("Headers must be a JSON object.", "error");
          return;
        }

        nextHeaders = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)])
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

    const methodValue = mockEditorMethodEl.value.trim().toUpperCase() as HttpMethod | "";
    const urlContainsValue = mockEditorUrlEl.value.trim();

    const nextRules = _state.rules.map((rule) => {
      if (rule.id !== selectedMockRuleId) {
        return rule;
      }

      const payload: Record<string, unknown> = {
        ...(rule.payload ?? {}),
        status: nextStatus,
        ...(nextDelay > 0 ? { delayMs: nextDelay } : {}),
        ...(Object.keys(nextHeaders).length > 0 ? { headers: nextHeaders } : {}),
      };

      if (rule.type === "mock-response") {
        payload.body = nextBody;
      }

      return {
        ...rule,
        enabled: mockEditorEnabledEl.value === "true",
        condition: {
          ...(methodValue ? { method: methodValue as HttpMethod } : {}),
          ...(urlContainsValue ? { urlContains: urlContainsValue } : {}),
        },
        payload,
      };
    });

    void saveRules(nextRules);
    setMockSaveStatus("Mock rule saved to local storage.", "ok");
  });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const setMockEditorFieldsDisabled = (disabled: boolean): void => {
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

const setMockSaveStatus = (message: string, tone: "neutral" | "ok" | "error"): void => {
  mockSaveStatusEl.textContent = message;
  mockSaveStatusEl.classList.remove("ok", "error");

  if (tone === "ok") {
    mockSaveStatusEl.classList.add("ok");
  } else if (tone === "error") {
    mockSaveStatusEl.classList.add("error");
  }
};

export const createMockRuleFromTemplate = (template: MockTemplate): RuleRow => ({
  id: generateId("rule"),
  name: template.name,
  type: "mock-response",
  enabled: true,
  priority: 50,
  createdAt: new Date().toISOString(),
  condition: {
    ...(template.method ? { method: template.method as HttpMethod } : {}),
    ...(template.urlContains ? { urlContains: template.urlContains } : {}),
  },
  payload: {
    status: template.status ?? 200,
    body: template.body ?? "",
    ...(template.headers ? { headers: template.headers } : {}),
    ...(template.delayMs ? { delayMs: template.delayMs } : {}),
  },
});
