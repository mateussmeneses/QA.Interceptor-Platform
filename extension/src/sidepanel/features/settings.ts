/**
 * Settings feature module.
 * Manages response assertions, diagnostics, and QA error simulation profiles (RQ-010).
 */

import type { AppState, ResponseAssertionRow, RuleRow } from "../shared/types";
import { escapeHtml, generateId } from "../shared/utils";
import { saveResponseAssertions, saveRules, loadRules } from "../../storage/index";

// ---------------------------------------------------------------------------
// Error simulation profiles (RQ-010)
// ---------------------------------------------------------------------------

type ErrorProfileId =
  | "400-bad-request"
  | "401-unauthorized"
  | "403-forbidden"
  | "404-not-found"
  | "500-server-error"
  | "network-failure";

type ErrorProfile = {
  id: ErrorProfileId;
  label: string;
  description: string;
  ruleType: "mock-response" | "block";
  status?: number;
  body?: string;
};

const ERROR_PROFILES: ErrorProfile[] = [
  {
    id: "400-bad-request",
    label: "400 Bad Request",
    description: "Returns 400 for all API calls. Validates client-side error handling.",
    ruleType: "mock-response",
    status: 400,
    body: '{"error":"bad_request","message":"The request was malformed."}',
  },
  {
    id: "401-unauthorized",
    label: "401 Unauthorized",
    description: "Simulates expired session/token. Validates auth redirect and re-login flow.",
    ruleType: "mock-response",
    status: 401,
    body: '{"error":"unauthorized","message":"Session expired. Please log in again."}',
  },
  {
    id: "403-forbidden",
    label: "403 Forbidden",
    description: "Simulates permission denied. Validates role-based access control UI.",
    ruleType: "mock-response",
    status: 403,
    body: '{"error":"forbidden","message":"You do not have permission to access this resource."}',
  },
  {
    id: "404-not-found",
    label: "404 Not Found",
    description: "Simulates missing resources. Validates empty states and 404 pages.",
    ruleType: "mock-response",
    status: 404,
    body: '{"error":"not_found","message":"The requested resource was not found."}',
  },
  {
    id: "500-server-error",
    label: "500 Server Error",
    description: "Simulates backend failure. Validates error boundaries and retry logic.",
    ruleType: "mock-response",
    status: 500,
    body: '{"error":"internal_error","message":"An unexpected server error occurred. Please try again."}',
  },
  {
    id: "network-failure",
    label: "Network Failure",
    description: "Blocks all API calls. Validates offline mode and connection loss handling.",
    ruleType: "block",
  },
];

const PROFILE_RULE_GROUP_ID = "grp-error-profiles";
const PROFILE_RULE_URL_PATTERN = "/api";

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

let assertionsAddButtonEl: HTMLButtonElement;
let responseAssertionsListEl: HTMLElement;
let errorProfilesListEl: HTMLElement;

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

let _state: AppState = { requests: [], rules: [], ruleGroups: [], validation: null, assertions: [] };

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initSettings(): void {
  const getEl = (id: string): HTMLElement => {
    const el = document.getElementById(id);

    if (!el) {
      throw new Error(`Settings feature: missing element #${id}`);
    }

    return el;
  };

  assertionsAddButtonEl = getEl("assertions-add-button") as HTMLButtonElement;
  responseAssertionsListEl = getEl("response-assertions-list");
  errorProfilesListEl = getEl("error-profiles-list");

  bindEvents();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderSettings(state: AppState): void {
  _state = state;
  renderResponseAssertions(state.assertions);
  renderErrorProfiles(state.rules);
}

// ---------------------------------------------------------------------------
// Response assertions
// ---------------------------------------------------------------------------

const renderResponseAssertions = (assertions: ResponseAssertionRow[]): void => {
  if (assertions.length === 0) {
    responseAssertionsListEl.innerHTML =
      '<li class="placeholder">No assertions added. Add one to validate responses.</li>';
    return;
  }

  responseAssertionsListEl.innerHTML = assertions
    .map((assertion) => {
      const statusClass = assertion.error ? "error" : assertion.actual !== undefined ? "ok" : "pending";
      const statusIcon = assertion.error ? "❌" : assertion.actual !== undefined ? "✓" : "○";
      const typeLabel = `${assertion.type}${assertion.path ? ` (${assertion.path})` : ""}`;
      const expectedText = `Expected: ${String(assertion.expected)}`;
      const actualText =
        assertion.actual !== undefined ? `Actual: ${String(assertion.actual)}` : "Not validated yet";
      const errorText = assertion.error ? `Error: ${assertion.error}` : "";
      const toggleLabel = assertion.enabled
        ? `Disable assertion ${typeLabel}`
        : `Enable assertion ${typeLabel}`;
      const deleteLabel = `Delete assertion ${typeLabel}`;

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
          <button type="button" class="icon-btn" data-assertion-toggle="${escapeHtml(assertion.id)}" title="Toggle assertion" aria-label="${escapeHtml(toggleLabel)}" aria-pressed="${String(assertion.enabled)}">
            ${assertion.enabled ? "✓" : "○"}
          </button>
          <button type="button" class="icon-btn danger" data-assertion-delete="${escapeHtml(assertion.id)}" title="Delete assertion" aria-label="${escapeHtml(deleteLabel)}">
            ✕
          </button>
        </div>
      </li>`;
    })
    .join("");
};

// ---------------------------------------------------------------------------
// Error simulation profiles (RQ-010)
// ---------------------------------------------------------------------------

const renderErrorProfiles = (rules: RuleRow[]): void => {
  const activeProfileIds = getActiveProfileIds(rules);

  errorProfilesListEl.innerHTML = ERROR_PROFILES.map((profile) => {
    const isActive = activeProfileIds.has(profile.id);
    const tone = isActive ? "active" : "";
    const actionLabel = isActive ? "Deactivate" : "Activate";

    return `<li class="error-profile-card ${tone}">
      <div class="error-profile-info">
        <strong>${escapeHtml(profile.label)}</strong>
        <p class="error-profile-desc">${escapeHtml(profile.description)}</p>
      </div>
      <button
        type="button"
        class="action-btn${isActive ? " danger" : ""}"
        data-profile-toggle="${escapeHtml(profile.id)}"
      >${actionLabel}</button>
    </li>`;
  }).join("");
};

const getActiveProfileIds = (rules: RuleRow[]): Set<string> => {
  const active = new Set<string>();

  for (const profile of ERROR_PROFILES) {
    const ruleId = profileRuleId(profile.id);
    if (rules.some((r) => r.id === ruleId && r.enabled)) {
      active.add(profile.id);
    }
  }

  return active;
};

const profileRuleId = (profileId: ErrorProfileId): string =>
  `error-profile-${profileId}`;

const buildProfileRule = (profile: ErrorProfile): RuleRow => ({
  id: profileRuleId(profile.id),
  name: `[Profile] ${profile.label}`,
  type: profile.ruleType,
  enabled: true,
  priority: 999,
  groupId: PROFILE_RULE_GROUP_ID,
  createdAt: new Date().toISOString(),
  condition: { urlContains: PROFILE_RULE_URL_PATTERN },
  payload:
    profile.ruleType === "mock-response"
      ? {
          status: profile.status ?? 500,
          body: profile.body ?? "",
          headers: { "content-type": "application/json" },
        }
      : {},
});

const activateProfile = async (profileId: ErrorProfileId): Promise<void> => {
  const profile = ERROR_PROFILES.find((p) => p.id === profileId);

  if (!profile) {
    return;
  }

  const rules = await loadRules();
  const ruleId = profileRuleId(profileId);

  // Deactivate all other profiles before activating this one
  const withoutOtherProfiles = rules.filter(
    (r) => !ERROR_PROFILES.some((p) => profileRuleId(p.id) === r.id)
  );

  const existingIndex = withoutOtherProfiles.findIndex((r) => r.id === ruleId);

  if (existingIndex >= 0) {
    withoutOtherProfiles[existingIndex] = { ...withoutOtherProfiles[existingIndex], enabled: true };
    await saveRules(withoutOtherProfiles);
  } else {
    const newRule = buildProfileRule(profile);
    await saveRules([newRule, ...withoutOtherProfiles]);
  }
};

const deactivateProfile = async (profileId: ErrorProfileId): Promise<void> => {
  const rules = await loadRules();
  const ruleId = profileRuleId(profileId);
  const nextRules = rules.filter((r) => r.id !== ruleId);
  await saveRules(nextRules);
};

const isErrorProfileId = (value: string): value is ErrorProfileId =>
  ERROR_PROFILES.some((p) => p.id === value);

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------

const bindEvents = (): void => {
  assertionsAddButtonEl.addEventListener("click", () => {
    const newAssertion: ResponseAssertionRow = {
      id: generateId("assertion"),
      type: "status",
      enabled: true,
      expected: 200,
      createdAt: new Date().toISOString(),
    };

    const nextAssertions = [newAssertion, ..._state.assertions];
    void saveResponseAssertions(nextAssertions);
  });

  responseAssertionsListEl.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const toggleButton = target?.closest("[data-assertion-toggle]") as HTMLButtonElement | null;
    const deleteButton = target?.closest("[data-assertion-delete]") as HTMLButtonElement | null;

    if (toggleButton) {
      const assertionId = toggleButton.dataset.assertionToggle;

      if (!assertionId) {
        return;
      }

      const nextAssertions = _state.assertions.map((a) =>
        a.id === assertionId ? { ...a, enabled: !a.enabled } : a
      );
      void saveResponseAssertions(nextAssertions);
      return;
    }

    if (!deleteButton) {
      return;
    }

    const assertionId = deleteButton.dataset.assertionDelete;

    if (!assertionId) {
      return;
    }

    const nextAssertions = _state.assertions.filter((a) => a.id !== assertionId);
    void saveResponseAssertions(nextAssertions);
  });

  errorProfilesListEl.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const profileButton = target?.closest("[data-profile-toggle]") as HTMLButtonElement | null;

    if (!profileButton) {
      return;
    }

    const profileId = profileButton.dataset.profileToggle;

    if (!profileId || !isErrorProfileId(profileId)) {
      return;
    }

    const isActive = getActiveProfileIds(_state.rules).has(profileId);

    if (isActive) {
      void deactivateProfile(profileId);
    } else {
      void activateProfile(profileId);
    }
  });
};
