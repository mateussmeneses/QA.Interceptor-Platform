/**
 * Rules feature module.
 * Manages the rules list, editor, groups manager, import/export.
 */

import type {
  AppState,
  RuleRow,
  RuleGroupRow,
  RulesFilterType,
  RulesStatusFilter,
  RuleValidation,
  HttpMethod
} from "../shared/types";
import { isRuleType } from "../shared/types";
import {
  escapeHtml,
  formatTimestamp,
  formatRuleType,
  formatRuleCondition,
  renderRuleChips,
  triggerDownload,
  formatDateSlug,
  generateId
} from "../shared/utils";
import { createModalController, type ModalController } from "../shared/modal-controller";
import { saveRules, saveRuleGroups } from "../../storage/index";
import { describeRuleCoverage } from "../../../../packages/rule-engine/src/index";
import { buildRuleFromEditorValues } from "../shared/rule-builders";

// ---------------------------------------------------------------------------
// DOM element references
// ---------------------------------------------------------------------------

let rulesStatsEl: HTMLElement;
let rulesValidationEl: HTMLElement;
let rulesGroupedListEl: HTMLElement;
let rulesEmptyStateEl: HTMLElement;
let rulesSearchEl: HTMLInputElement;
let rulesTypeFilterEl: HTMLSelectElement;
let rulesStatusFilterEl: HTMLSelectElement;
let ruleEditorCaptionEl: HTMLElement;
let ruleEditorFormEl: HTMLFormElement;
let editorSaveStatusEl: HTMLElement;
let editorNameEl: HTMLInputElement;
let editorTypeEl: HTMLSelectElement;
let editorPriorityEl: HTMLInputElement;
let editorMethodEl: HTMLSelectElement;
let editorEnabledEl: HTMLSelectElement;
let editorGroupEl: HTMLSelectElement;
let editorUrlEl: HTMLInputElement;
let editorPayloadEl: HTMLTextAreaElement;
let editorSaveButtonEl: HTMLButtonElement;
let rulesCreateButtonEl: HTMLButtonElement;
let rulesGroupNameInputEl: HTMLInputElement;
let rulesGroupCreateButtonEl: HTMLButtonElement;
let rulesGroupsListEl: HTMLElement;
let editorDuplicateButtonEl: HTMLButtonElement;
let editorDeleteButtonEl: HTMLButtonElement;
let rulesImportButtonEl: HTMLButtonElement;
let rulesExportButtonEl: HTMLButtonElement;
let rulesImportInputEl: HTMLInputElement;
let rulesOpenModalEditorButtonEl: HTMLButtonElement;
let rulesEditorModalPanelEl: HTMLElement;
let rulesEditorModalDialogEl: HTMLElement;
let rulesEditorModalCloseButtonEl: HTMLButtonElement;
let rulesEditorTabBasicEl: HTMLButtonElement;
let rulesEditorTabAdvancedEl: HTMLButtonElement;
let rulesEditorPanelBasicEl: HTMLElement;
let rulesEditorPanelAdvancedEl: HTMLElement;
let rulesModalNameEl: HTMLInputElement;
let rulesModalTypeEl: HTMLSelectElement;
let rulesModalPriorityEl: HTMLInputElement;
let rulesModalEnabledEl: HTMLSelectElement;
let rulesModalUrlEl: HTMLInputElement;
let rulesModalPayloadEl: HTMLTextAreaElement;
let rulesModalMethodEl: HTMLSelectElement;
let rulesModalGroupEl: HTMLSelectElement;
let rulesModalTagsEl: HTMLInputElement;
let rulesModalNotesEl: HTMLTextAreaElement;
let rulesModalSavePreviewButtonEl: HTMLButtonElement;
let rulesModalCancelButtonEl: HTMLButtonElement;
let rulesEditorModalController: ModalController;

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
let selectedRuleId: string | null = null;
let rulesSearchQuery = "";
let rulesTypeFilter: RulesFilterType = "all";
let rulesStatusFilter: RulesStatusFilter = "all";

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initRules(): void {
  rulesStatsEl = getEl("rules-stats");
  rulesValidationEl = getEl("rules-validation");
  rulesGroupedListEl = getEl("rules-grouped-list");
  rulesEmptyStateEl = getEl("rules-empty-state");
  rulesSearchEl = getEl("rules-search") as HTMLInputElement;
  rulesTypeFilterEl = getEl("rules-type-filter") as HTMLSelectElement;
  rulesStatusFilterEl = getEl("rules-status-filter") as HTMLSelectElement;
  ruleEditorCaptionEl = getEl("rule-editor-caption");
  ruleEditorFormEl = getEl("rule-editor-form") as HTMLFormElement;
  editorSaveStatusEl = getEl("editor-save-status");
  editorNameEl = getEl("editor-rule-name") as HTMLInputElement;
  editorTypeEl = getEl("editor-rule-type") as HTMLSelectElement;
  editorPriorityEl = getEl("editor-rule-priority") as HTMLInputElement;
  editorMethodEl = getEl("editor-rule-method") as HTMLSelectElement;
  editorEnabledEl = getEl("editor-rule-enabled") as HTMLSelectElement;
  editorGroupEl = getEl("editor-rule-group") as HTMLSelectElement;
  editorUrlEl = getEl("editor-rule-url") as HTMLInputElement;
  editorPayloadEl = getEl("editor-rule-payload") as HTMLTextAreaElement;
  editorSaveButtonEl = getEl("editor-save-button") as HTMLButtonElement;
  rulesCreateButtonEl = getEl("rules-create-button") as HTMLButtonElement;
  rulesGroupNameInputEl = getEl("rules-group-name-input") as HTMLInputElement;
  rulesGroupCreateButtonEl = getEl("rules-group-create-button") as HTMLButtonElement;
  rulesGroupsListEl = getEl("rules-groups-list");
  editorDuplicateButtonEl = getEl("editor-duplicate-button") as HTMLButtonElement;
  editorDeleteButtonEl = getEl("editor-delete-button") as HTMLButtonElement;
  rulesImportButtonEl = getEl("rules-import-button") as HTMLButtonElement;
  rulesExportButtonEl = getEl("rules-export-button") as HTMLButtonElement;
  rulesImportInputEl = getEl("rules-import-input") as HTMLInputElement;
  rulesOpenModalEditorButtonEl = getEl("rules-open-modal-editor-button") as HTMLButtonElement;
  rulesEditorModalPanelEl = getEl("rules-editor-modal-panel");
  rulesEditorModalDialogEl = getEl("rules-editor-modal-dialog");
  rulesEditorModalCloseButtonEl = getEl("rules-editor-modal-close-button") as HTMLButtonElement;
  rulesEditorTabBasicEl = getEl("rules-editor-tab-basic") as HTMLButtonElement;
  rulesEditorTabAdvancedEl = getEl("rules-editor-tab-advanced") as HTMLButtonElement;
  rulesEditorPanelBasicEl = getEl("rules-editor-panel-basic");
  rulesEditorPanelAdvancedEl = getEl("rules-editor-panel-advanced");
  rulesModalNameEl = getEl("rules-modal-name") as HTMLInputElement;
  rulesModalTypeEl = getEl("rules-modal-type") as HTMLSelectElement;
  rulesModalPriorityEl = getEl("rules-modal-priority") as HTMLInputElement;
  rulesModalEnabledEl = getEl("rules-modal-enabled") as HTMLSelectElement;
  rulesModalUrlEl = getEl("rules-modal-url") as HTMLInputElement;
  rulesModalPayloadEl = getEl("rules-modal-payload") as HTMLTextAreaElement;
  rulesModalMethodEl = getEl("rules-modal-method") as HTMLSelectElement;
  rulesModalGroupEl = getEl("rules-modal-group") as HTMLSelectElement;
  rulesModalTagsEl = getEl("rules-modal-tags") as HTMLInputElement;
  rulesModalNotesEl = getEl("rules-modal-notes") as HTMLTextAreaElement;
  rulesModalSavePreviewButtonEl = getEl("rules-modal-save-preview-button") as HTMLButtonElement;
  rulesModalCancelButtonEl = getEl("rules-modal-cancel-button") as HTMLButtonElement;

  rulesEditorModalController = createModalController({
    panelEl: rulesEditorModalPanelEl,
    dialogEl: rulesEditorModalDialogEl,
    onRequestClose: () => {
      closeRulesModalEditor();
    },
    initialFocusEl: () => rulesModalNameEl,
    defaultRestoreFocusEl: () => rulesOpenModalEditorButtonEl
  });

  bindEvents();
}

const getEl = (id: string): HTMLElement => {
  const el = document.getElementById(id);

  if (!el) {
    throw new Error(`Rules feature: missing element #${id}`);
  }

  return el;
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderRules(state: AppState): void {
  _state = state;
  renderRuleGroupsManager(state.ruleGroups);
  renderRulesList(state.rules, state.ruleGroups, state.validation);
}

const renderRulesList = (
  rows: RuleRow[],
  groups: RuleGroupRow[],
  validation: RuleValidation | null
): void => {
  rulesStatsEl.textContent = `${rows.filter((r) => r.enabled).length} enabled / ${rows.length} total`;
  renderValidationStatus(validation);

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
  rulesGroupedListEl.innerHTML = renderGroupedRulesHtml(filteredRows, groups);

  const selectedRule = filteredRows.find((r) => r.id === selectedRuleId) ?? null;
  populateEditor(selectedRule);
};

const renderValidationStatus = (validation: RuleValidation | null): void => {
  if (!validation) {
    rulesValidationEl.innerHTML =
      '<span class="validation-pill neutral">Validation: pending</span>';
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

const renderRuleGroupsManager = (groups: RuleGroupRow[]): void => {
  if (groups.length === 0) {
    rulesGroupsListEl.innerHTML = '<li class="placeholder">No groups yet.</li>';
    editorGroupEl.innerHTML = '<option value="">Ungrouped</option>';
    rulesModalGroupEl.innerHTML = '<option value="">Ungrouped</option>';
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

  rulesModalGroupEl.innerHTML = ['<option value="">Ungrouped</option>']
    .concat(
      ordered.map(
        (group) =>
          `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}${group.enabled ? "" : " (Disabled)"}</option>`
      )
    )
    .join("");
};

const renderGroupedRulesHtml = (rows: RuleRow[], groups: RuleGroupRow[]): string => {
  const labels = new Map(groups.map((g) => [g.id, g.name] as const));
  const priorities = new Map(groups.map((g) => [g.id, g.priority] as const));
  const grouped: Record<string, RuleRow[]> = {};

  const sortedRows = [...rows].sort((a, b) => {
    const left = a.groupId
      ? (priorities.get(a.groupId) ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;
    const right = b.groupId
      ? (priorities.get(b.groupId) ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;

    if (left !== right) {
      return left - right;
    }

    return a.priority - b.priority;
  });

  for (const row of sortedRows) {
    const key = row.groupId ? (labels.get(row.groupId) ?? "Ungrouped") : "Ungrouped";

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(row);
  }

  return Object.entries(grouped)
    .map(([groupLabel, groupRows]) => {
      const items = groupRows
        .map((rule) => {
          const activeClass = selectedRuleId === rule.id ? " active" : "";

          return `<li class="rule-card${activeClass}" data-rule-id="${escapeHtml(rule.id)}"><div class="rule-card-header"><div class="rule-line"><strong>${escapeHtml(rule.name)}</strong><span>${escapeHtml(rule.type)}</span></div><button type="button" class="rule-select" data-rule-select="${escapeHtml(rule.id)}">Edit</button></div><div class="rule-meta"><small>${escapeHtml(formatRuleCondition(rule.condition))}</small><button type="button" class="rule-toggle" data-rule-toggle="${escapeHtml(rule.id)}">${rule.enabled ? "Disable" : "Enable"}</button></div><div class="rule-pills"><span class="pill muted">Priority ${escapeHtml(String(rule.priority))}</span>${rule.enabled ? "" : '<span class="pill muted">Disabled</span>'}</div>${renderRulePayloadPreview(rule)}</li>`;
        })
        .join("");

      return `<section class="rule-group"><div class="rule-group-head"><h4>${escapeHtml(groupLabel)}</h4><span class="group-count">${escapeHtml(String(groupRows.length))}</span></div><ul class="rule-group-list">${items}</ul></section>`;
    })
    .join("");
};

const renderRulePayloadPreview = (rule: RuleRow): string => {
  if (rule.type !== "mock-response" && rule.type !== "mock-status") {
    return "";
  }

  const preview = JSON.stringify(rule.payload, null, 2) ?? "{}";
  return `<details class="payload-preview"><summary>Mock payload preview</summary><pre>${escapeHtml(preview)}</pre></details>`;
};

const populateEditor = (rule: RuleRow | null): void => {
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
  updateCoverageHint();
};

// QAI-001 / ADR-008: non-blocking hint when the editor condition covers all
// traffic (no urlContains). Coverage is read from the engine, never re-derived.
const updateCoverageHint = (): void => {
  const coverage = describeRuleCoverage({
    id: "",
    name: "",
    type: "block",
    enabled: false,
    priority: 0,
    createdAt: "",
    condition: {
      ...(editorMethodEl.value.trim() ? { method: editorMethodEl.value.trim() as HttpMethod } : {}),
      ...(editorUrlEl.value.trim() ? { urlContains: editorUrlEl.value.trim() } : {})
    },
    payload: {}
  });

  if (coverage.matchesAllUrls) {
    const scope = coverage.methodScoped
      ? `every ${editorMethodEl.value.trim().toUpperCase()} request`
      : "ALL traffic";
    setEditorSaveStatus(`Heads up: this rule matches ${scope} (no URL filter).`, "neutral");
  }

  // QAI-003: guidance + safety note for the insert-script rule type.
  if (editorTypeEl.value === "insert-script") {
    setEditorSaveStatus(
      'Insert Script runs your JavaScript on matching pages. Payload format: {"code": "…"}. Keep it disabled until ready.',
      "neutral"
    );
  }

  // QAI-004: guidance for the inject-css rule type.
  if (editorTypeEl.value === "inject-css") {
    setEditorSaveStatus(
      'Inject CSS applies your styles to matching pages. Payload format: {"css": "…"}.',
      "neutral"
    );
  }
};

const setEditorFieldsDisabled = (disabled: boolean): void => {
  editorNameEl.disabled = disabled;
  editorTypeEl.disabled = disabled;
  editorPriorityEl.disabled = disabled;
  editorMethodEl.disabled = disabled;
  editorEnabledEl.disabled = disabled;
  editorGroupEl.disabled = disabled;
  editorUrlEl.disabled = disabled;
  editorPayloadEl.disabled = disabled;
  editorSaveButtonEl.disabled = disabled;
};

const setEditorSaveStatus = (message: string, tone: "neutral" | "ok" | "error"): void => {
  editorSaveStatusEl.textContent = message;
  editorSaveStatusEl.classList.remove("ok", "error");

  if (tone === "ok") {
    editorSaveStatusEl.classList.add("ok");
  } else if (tone === "error") {
    editorSaveStatusEl.classList.add("error");
  }
};

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

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

    const haystack =
      `${rule.name} ${rule.type} ${rule.condition.method ?? ""} ${rule.condition.urlContains ?? ""}`.toLowerCase();
    return haystack.includes(rulesSearchQuery);
  });

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------

const bindEvents = (): void => {
  rulesGroupedListEl.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const selectButton = target?.closest("[data-rule-select]") as HTMLButtonElement | null;
    const toggleButton = target?.closest("[data-rule-toggle]") as HTMLButtonElement | null;

    if (selectButton) {
      const nextId = selectButton.dataset.ruleSelect;

      if (nextId) {
        selectedRuleId = nextId;
        renderRules(_state);

        if (!rulesEditorModalPanelEl.classList.contains("hidden")) {
          populateModalFromSelectedRule();
        }
      }

      return;
    }

    if (!toggleButton) {
      return;
    }

    const ruleId = toggleButton.dataset.ruleToggle;

    if (!ruleId) {
      return;
    }

    const nextRules = _state.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );

    void saveRules(nextRules);
  });

  rulesSearchEl.addEventListener("input", () => {
    rulesSearchQuery = rulesSearchEl.value.trim().toLowerCase();
    renderRules(_state);
  });

  rulesOpenModalEditorButtonEl.addEventListener("click", () => {
    if (!_state.rules.length) {
      setEditorSaveStatus("Create a rule before opening the modal editor.", "error");
      return;
    }

    if (!selectedRuleId) {
      selectedRuleId = _state.rules[0]?.id ?? null;
    }

    openRulesModalEditor();
  });

  rulesTypeFilterEl.addEventListener("change", () => {
    const candidate = rulesTypeFilterEl.value;
    rulesTypeFilter = isRuleType(candidate) ? candidate : "all";
    renderRules(_state);
  });

  rulesStatusFilterEl.addEventListener("change", () => {
    const candidate = rulesStatusFilterEl.value;
    rulesStatusFilter = candidate === "enabled" || candidate === "disabled" ? candidate : "all";
    renderRules(_state);
  });

  rulesCreateButtonEl.addEventListener("click", () => {
    const nextRule = createDefaultRule();
    const nextRules = [nextRule, ..._state.rules];
    selectedRuleId = nextRule.id;
    void saveRules(nextRules);
    setEditorSaveStatus("New rule created. Update fields and click Save Changes.", "ok");
  });

  rulesGroupCreateButtonEl.addEventListener("click", () => {
    const name = rulesGroupNameInputEl.value.trim();

    if (!name) {
      setEditorSaveStatus("Group name is required.", "error");
      return;
    }

    const nextPriority =
      _state.ruleGroups.length > 0 ? Math.max(..._state.ruleGroups.map((g) => g.priority)) + 1 : 0;

    const nextGroup: RuleGroupRow = {
      id: generateId("grp"),
      name,
      enabled: true,
      priority: nextPriority,
      createdAt: new Date().toISOString()
    };

    const nextGroups = [..._state.ruleGroups, nextGroup];
    rulesGroupNameInputEl.value = "";
    void saveRuleGroups(nextGroups);
    setEditorSaveStatus("Rule group created.", "ok");
  });

  rulesGroupsListEl.addEventListener("click", (event) => {
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

      const nextGroups = _state.ruleGroups.map((g) =>
        g.id === groupId ? { ...g, enabled: !g.enabled } : g
      );
      void saveRuleGroups(nextGroups);
      return;
    }

    if (upButton || downButton) {
      const groupId = upButton?.dataset.groupUp ?? downButton?.dataset.groupDown;

      if (!groupId) {
        return;
      }

      const sorted = [..._state.ruleGroups].sort((a, b) => a.priority - b.priority);
      const index = sorted.findIndex((g) => g.id === groupId);

      if (index < 0) {
        return;
      }

      const targetIndex = upButton ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= sorted.length) {
        return;
      }

      const [moved] = sorted.splice(index, 1);
      sorted.splice(targetIndex, 0, moved);

      const nextGroups = sorted.map((g, order) => ({ ...g, priority: order }));
      void saveRuleGroups(nextGroups);
      return;
    }

    if (renameButton) {
      const groupId = renameButton.dataset.groupRename;

      if (!groupId) {
        return;
      }

      const current = _state.ruleGroups.find((g) => g.id === groupId);

      if (!current) {
        return;
      }

      const renamed = window.prompt("Rename group", current.name)?.trim();

      if (!renamed) {
        return;
      }

      const nextGroups = _state.ruleGroups.map((g) =>
        g.id === groupId ? { ...g, name: renamed } : g
      );
      void saveRuleGroups(nextGroups);
      return;
    }

    if (!deleteButton) {
      return;
    }

    const groupId = deleteButton.dataset.groupDelete;

    if (!groupId) {
      return;
    }

    const inUseCount = _state.rules.filter((r) => r.groupId === groupId).length;

    if (inUseCount > 0) {
      setEditorSaveStatus("Cannot delete a group that still has rules assigned.", "error");
      return;
    }

    const nextGroups = _state.ruleGroups
      .filter((g) => g.id !== groupId)
      .map((g, order) => ({ ...g, priority: order }));
    void saveRuleGroups(nextGroups);
  });

  rulesExportButtonEl.addEventListener("click", () => {
    if (_state.rules.length === 0) {
      setEditorSaveStatus("No rules to export.", "neutral");
      return;
    }

    triggerDownload(
      `qa-interceptor-rules-${formatDateSlug()}.json`,
      JSON.stringify(_state.rules, null, 2),
      "application/json"
    );
  });

  rulesImportButtonEl.addEventListener("click", () => {
    rulesImportInputEl.value = "";
    rulesImportInputEl.click();
  });

  rulesImportInputEl.addEventListener("change", () => {
    const file = rulesImportInputEl.files?.[0];

    if (!file) {
      return;
    }

    void (async () => {
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

      const imported = parsed.filter(isRuleRowShape);

      if (imported.length === 0) {
        setEditorSaveStatus("Import failed: no valid rules found in file.", "error");
        return;
      }

      const existingIds = new Set(_state.rules.map((r) => r.id));
      const newRules = imported.filter((r) => !existingIds.has(r.id));
      const nextRules = [..._state.rules, ...newRules];

      await saveRules(nextRules);
      setEditorSaveStatus(
        `Imported ${newRules.length} rule(s). ${imported.length - newRules.length} skipped (duplicate IDs).`,
        "ok"
      );
    })();
  });

  editorDuplicateButtonEl.addEventListener("click", () => {
    if (!selectedRuleId) {
      setEditorSaveStatus("Select a rule before duplicating.", "error");
      return;
    }

    const sourceRule = _state.rules.find((r) => r.id === selectedRuleId);

    if (!sourceRule) {
      setEditorSaveStatus("Selected rule was not found.", "error");
      return;
    }

    const duplicatedRule: RuleRow = {
      ...sourceRule,
      id: generateId("rule"),
      name: `${sourceRule.name} Copy`,
      priority: sourceRule.priority + 1
    };

    const nextRules = [duplicatedRule, ..._state.rules];
    selectedRuleId = duplicatedRule.id;
    void saveRules(nextRules);
    setEditorSaveStatus("Rule duplicated. Review and save if needed.", "ok");
  });

  editorDeleteButtonEl.addEventListener("click", () => {
    if (!selectedRuleId) {
      setEditorSaveStatus("Select a rule before deleting.", "error");
      return;
    }

    const nextRules = _state.rules.filter((r) => r.id !== selectedRuleId);

    if (nextRules.length === _state.rules.length) {
      setEditorSaveStatus("Selected rule was not found.", "error");
      return;
    }

    selectedRuleId = nextRules[0]?.id ?? null;
    void saveRules(nextRules);
    setEditorSaveStatus("Rule deleted.", "ok");
  });

  for (const field of [
    editorNameEl,
    editorPriorityEl,
    editorMethodEl,
    editorEnabledEl,
    editorGroupEl,
    editorUrlEl,
    editorPayloadEl
  ]) {
    field.addEventListener("input", () => {
      if (selectedRuleId) {
        setEditorSaveStatus("Unsaved changes.", "neutral");
      }
    });
  }

  // QAI-001: refresh the coverage hint as the condition fields change.
  editorUrlEl.addEventListener("input", updateCoverageHint);
  editorMethodEl.addEventListener("change", updateCoverageHint);
  // QAI-003: refresh the type-specific hint (e.g. insert-script guidance).
  editorTypeEl.addEventListener("change", updateCoverageHint);

  ruleEditorFormEl.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!selectedRuleId) {
      setEditorSaveStatus("Select a rule before saving.", "error");
      return;
    }

    const currentRule = _state.rules.find((r) => r.id === selectedRuleId);

    if (!currentRule) {
      setEditorSaveStatus("Selected rule was not found.", "error");
      return;
    }

    // QAI-008: assembly is a pure, tested builder so no field is ever dropped.
    const built = buildRuleFromEditorValues(currentRule, {
      name: editorNameEl.value,
      type: editorTypeEl.value,
      enabled: editorEnabledEl.value,
      priority: editorPriorityEl.value,
      method: editorMethodEl.value,
      groupId: editorGroupEl.value,
      urlContains: editorUrlEl.value,
      payloadJson: editorPayloadEl.value
    });

    if (!built.ok) {
      setEditorSaveStatus(built.error, "error");
      return;
    }

    const nextRules = _state.rules.map((rule) => (rule.id === selectedRuleId ? built.rule : rule));

    void saveRules(nextRules);
    setEditorSaveStatus("Rule changes saved to local storage.", "ok");
  });

  rulesEditorTabBasicEl.addEventListener("click", () => {
    setRulesEditorModalTab("basic");
  });

  rulesEditorTabAdvancedEl.addEventListener("click", () => {
    setRulesEditorModalTab("advanced");
  });

  rulesEditorModalCloseButtonEl.addEventListener("click", () => {
    closeRulesModalEditor();
  });

  rulesModalCancelButtonEl.addEventListener("click", () => {
    closeRulesModalEditor();
  });

  rulesModalSavePreviewButtonEl.addEventListener("click", () => {
    setEditorSaveStatus(
      "Modal preview save clicked. Use existing editor to persist changes.",
      "neutral"
    );
    closeRulesModalEditor();
  });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createDefaultRule = (): RuleRow => ({
  id: generateId("rule"),
  name: "New Rule",
  type: "block",
  enabled: false,
  priority: 100,
  createdAt: new Date().toISOString(),
  condition: { urlContains: "/api" },
  payload: {}
});

const isRuleRowShape = (value: unknown): value is RuleRow => {
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

const setRulesEditorModalTab = (tab: "basic" | "advanced"): void => {
  const basicActive = tab === "basic";

  rulesEditorTabBasicEl.classList.toggle("active", basicActive);
  rulesEditorTabAdvancedEl.classList.toggle("active", !basicActive);

  rulesEditorTabBasicEl.setAttribute("aria-selected", String(basicActive));
  rulesEditorTabAdvancedEl.setAttribute("aria-selected", String(!basicActive));

  rulesEditorPanelBasicEl.classList.toggle("hidden", !basicActive);
  rulesEditorPanelAdvancedEl.classList.toggle("hidden", basicActive);
};

const populateModalFromSelectedRule = (): void => {
  const rule = _state.rules.find((r) => r.id === selectedRuleId) ?? null;

  if (!rule) {
    rulesModalNameEl.value = "";
    rulesModalTypeEl.value = "block";
    rulesModalPriorityEl.value = "100";
    rulesModalEnabledEl.value = "false";
    rulesModalUrlEl.value = "";
    rulesModalPayloadEl.value = "{}";
    rulesModalMethodEl.value = "";
    rulesModalGroupEl.value = "";
    rulesModalTagsEl.value = "";
    rulesModalNotesEl.value = "";
    return;
  }

  rulesModalNameEl.value = rule.name;
  rulesModalTypeEl.value = rule.type;
  rulesModalPriorityEl.value = String(rule.priority);
  rulesModalEnabledEl.value = String(rule.enabled);
  rulesModalUrlEl.value = rule.condition.urlContains ?? "";
  rulesModalPayloadEl.value = JSON.stringify(rule.payload ?? {}, null, 2);
  rulesModalMethodEl.value = rule.condition.method ?? "";
  rulesModalGroupEl.value = rule.groupId ?? "";
  rulesModalTagsEl.value = "";
  rulesModalNotesEl.value = "";
};

const openRulesModalEditor = (): void => {
  populateModalFromSelectedRule();
  setRulesEditorModalTab("basic");
  rulesOpenModalEditorButtonEl.setAttribute("aria-expanded", "true");
  rulesEditorModalController.open();
};

const closeRulesModalEditor = (): void => {
  rulesOpenModalEditorButtonEl.setAttribute("aria-expanded", "false");
  rulesEditorModalController.close();
};

export const renderRuleChipsExport = renderRuleChips;
export const formatRuleTypeExport = formatRuleType;
