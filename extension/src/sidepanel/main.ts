/**
 * Sidepanel orchestrator.
 * Bootstraps all feature modules, manages shared state, and drives renders on storage changes.
 */

import type { AppState, ViewId } from "./shared/types";
import { initTheme } from "./shared/theme-manager";
import { getActiveView, initNavigation, onActiveViewChange } from "./features/navigation";
import { initRules, renderRules } from "./features/rules";
import { initNetwork, renderNetwork } from "./features/network";
import { initMocks, renderMocks } from "./features/mocks";
import { initHistory, renderHistory } from "./features/history";
import { initSettings, renderSettings } from "./features/settings";
import {
  STORAGE_KEYS,
  parseRules,
  parseRuleGroups,
  parseCapturedRequests,
  parseRuleValidation,
  parseResponseAssertions,
} from "../storage/index";

// ---------------------------------------------------------------------------
// Initialize theme on startup
// ---------------------------------------------------------------------------

initTheme();

// ---------------------------------------------------------------------------
// State loading
// ---------------------------------------------------------------------------

const loadAppState = async (): Promise<AppState> => {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.CAPTURED_REQUESTS,
    STORAGE_KEYS.RULES,
    STORAGE_KEYS.RULE_GROUPS,
    STORAGE_KEYS.RULE_VALIDATION,
    STORAGE_KEYS.RESPONSE_ASSERTIONS,
  ]);

  return {
    requests: parseCapturedRequests(stored[STORAGE_KEYS.CAPTURED_REQUESTS]),
    rules: parseRules(stored[STORAGE_KEYS.RULES]),
    ruleGroups: parseRuleGroups(stored[STORAGE_KEYS.RULE_GROUPS]),
    validation: parseRuleValidation(stored[STORAGE_KEYS.RULE_VALIDATION]),
    assertions: parseResponseAssertions(stored[STORAGE_KEYS.RESPONSE_ASSERTIONS]),
  };
};

// ---------------------------------------------------------------------------
// Render dispatch
// ---------------------------------------------------------------------------

let currentState: AppState | null = null;
let renderScheduled = false;

const renderActiveView = (state: AppState, view: ViewId): void => {
  if (view === "rules") {
    renderRules(state);
    return;
  }

  if (view === "network") {
    renderNetwork(state);
    // Assertions UI is rendered by settings module inside the network compose panel.
    renderSettings(state);
    return;
  }

  if (view === "mocks") {
    renderMocks(state);
    return;
  }

  if (view === "history") {
    renderHistory(state);
    return;
  }

  renderSettings(state);
};

const scheduleRender = (): void => {
  if (!currentState || renderScheduled) {
    return;
  }

  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;

    if (!currentState) {
      return;
    }

    renderActiveView(currentState, getActiveView());
  });
};

const applyStorageChanges = (
  state: AppState,
  changes: { [key: string]: chrome.storage.StorageChange }
): boolean => {
  let changed = false;

  if (changes[STORAGE_KEYS.CAPTURED_REQUESTS]) {
    state.requests = parseCapturedRequests(changes[STORAGE_KEYS.CAPTURED_REQUESTS].newValue);
    changed = true;
  }

  if (changes[STORAGE_KEYS.RULES]) {
    state.rules = parseRules(changes[STORAGE_KEYS.RULES].newValue);
    changed = true;
  }

  if (changes[STORAGE_KEYS.RULE_GROUPS]) {
    state.ruleGroups = parseRuleGroups(changes[STORAGE_KEYS.RULE_GROUPS].newValue);
    changed = true;
  }

  if (changes[STORAGE_KEYS.RULE_VALIDATION]) {
    state.validation = parseRuleValidation(changes[STORAGE_KEYS.RULE_VALIDATION].newValue);
    changed = true;
  }

  if (changes[STORAGE_KEYS.RESPONSE_ASSERTIONS]) {
    state.assertions = parseResponseAssertions(changes[STORAGE_KEYS.RESPONSE_ASSERTIONS].newValue);
    changed = true;
  }

  return changed;
};

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const bootstrap = async (): Promise<void> => {
  initRules();
  initNetwork();
  initMocks();
  initHistory();
  initSettings();

  onActiveViewChange(() => {
    scheduleRender();
  });
  initNavigation();

  currentState = await loadAppState();
  scheduleRender();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !currentState) {
      return;
    }

    if (applyStorageChanges(currentState, changes)) {
      scheduleRender();
    }
  });
};

void bootstrap();
