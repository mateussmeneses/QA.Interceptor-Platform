/**
 * Sidepanel orchestrator.
 * Bootstraps all feature modules, manages shared state, and drives renders on storage changes.
 */

import type { AppState } from "./shared/types";
import { initTheme } from "./shared/theme-manager";
import { initNavigation } from "./features/navigation";
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

const renderAll = (state: AppState): void => {
  renderRules(state);
  renderNetwork(state);
  renderMocks(state);
  renderHistory(state);
  renderSettings(state);
};

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const bootstrap = async (): Promise<void> => {
  initNavigation();
  initRules();
  initNetwork();
  initMocks();
  initHistory();
  initSettings();

  const initialState = await loadAppState();
  renderAll(initialState);

  chrome.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    void loadAppState().then(renderAll);
  });
};

void bootstrap();
