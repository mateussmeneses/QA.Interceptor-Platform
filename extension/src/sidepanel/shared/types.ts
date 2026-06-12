/**
 * Sidepanel-local type definitions.
 * These types represent view-model shapes used by the sidepanel UI.
 */

import type {
  StoredCapturedRequest,
  StoredRuleValidation,
  StoredResponseAssertion,
} from "../../storage/index";
import type { Rule, RuleGroup, HttpMethod } from "../../../../packages/shared-types/src/index";

export type { HttpMethod };

// ---------------------------------------------------------------------------
// View IDs
// ---------------------------------------------------------------------------

export type ViewId = "rules" | "network" | "mocks" | "history" | "settings";

export const isViewId = (value: string | undefined): value is ViewId =>
  value === "rules" ||
  value === "network" ||
  value === "mocks" ||
  value === "history" ||
  value === "settings";

// ---------------------------------------------------------------------------
// Rule view-model (aliased for UI code)
// ---------------------------------------------------------------------------

export type RuleType =
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

export type RulesFilterType = "all" | RuleType;
export type RulesStatusFilter = "all" | "enabled" | "disabled";

// RuleRow is Rule — the full shared type, used directly in the UI layer.
export type RuleRow = Rule;

export type RuleGroupRow = RuleGroup;

// ---------------------------------------------------------------------------
// Network view-model
// ---------------------------------------------------------------------------

export type NetworkStatusFilter = "all" | "pending" | "2xx" | "3xx" | "4xx" | "5xx";

export type RequestRow = StoredCapturedRequest & {
  response?: StoredCapturedRequest["response"];
};

// ---------------------------------------------------------------------------
// Mock view-model
// ---------------------------------------------------------------------------

export type MockTypeFilter = "all" | "mock-response" | "mock-status";
export type MockStatusFilter = "all" | "enabled" | "disabled";

export type MockTemplate = {
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

// ---------------------------------------------------------------------------
// History view-model
// ---------------------------------------------------------------------------

export type HistoryOutcomeFilter = "all" | "passed" | "failed" | "pending";
export type HistorySortOrder = "recent" | "oldest";

export type HistorySession = {
  id: string;
  label: string;
  startedAt: string;
  endedAt: string;
  requests: RequestRow[];
  failedCount: number;
  pendingCount: number;
};

// ---------------------------------------------------------------------------
// Response assertions view-model
// ---------------------------------------------------------------------------

export type ResponseAssertionRow = StoredResponseAssertion;

// ---------------------------------------------------------------------------
// Rule validation view-model
// ---------------------------------------------------------------------------

export type RuleValidation = StoredRuleValidation;

// ---------------------------------------------------------------------------
// App-level shared state (passed to all feature renders)
// ---------------------------------------------------------------------------

export type AppState = {
  requests: RequestRow[];
  rules: RuleRow[];
  ruleGroups: RuleGroupRow[];
  validation: RuleValidation | null;
  assertions: ResponseAssertionRow[];
};

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export const isRuleType = (value: unknown): value is RuleType =>
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

export const isNetworkStatusFilter = (value: string): value is NetworkStatusFilter =>
  value === "all" ||
  value === "pending" ||
  value === "2xx" ||
  value === "3xx" ||
  value === "4xx" ||
  value === "5xx";

export const isHistoryOutcomeFilter = (value: string): value is HistoryOutcomeFilter =>
  value === "all" || value === "passed" || value === "failed" || value === "pending";

export const isMockRule = (rule: RuleRow): rule is RuleRow & { type: "mock-response" | "mock-status" } =>
  rule.type === "mock-response" || rule.type === "mock-status";
