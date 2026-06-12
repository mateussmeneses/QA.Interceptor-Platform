/**
 * Pure storage parse functions — testable without browser environment.
 * Extracted from the storage abstraction layer so they can be unit tested.
 */

// ---------------------------------------------------------------------------
// Minimal local type copies for parse functions (no chrome dependency)
// ---------------------------------------------------------------------------

type StoredMatchedRule = {
  ruleId: string;
  ruleName: string;
  type: string;
  payload?: Record<string, unknown>;
};

type StoredCapturedResponse = {
  status: number;
  durationMs: number;
  timestamp: string;
  body?: string;
  headers?: Record<string, string>;
};

export type ParsedCapturedRequest = {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: string;
  captureSource: "network" | "mock";
  resourceType?: string;
  tabId?: number;
  startedAtMs: number;
  matchedRules: StoredMatchedRule[];
  response?: StoredCapturedResponse;
};

export type ParsedRule = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  groupId?: string;
  createdAt: string;
  condition: { urlContains?: string; method?: string };
  payload: Record<string, unknown>;
};

export type ParsedRuleGroup = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  createdAt: string;
};

export type ParsedResponseAssertion = {
  id: string;
  type: "status" | "header" | "json-path" | "body-contains";
  enabled: boolean;
  expected: unknown;
  path?: string;
  actual?: unknown;
  error?: string;
  createdAt: string;
};

export type ParsedMockEnvVar = {
  id: string;
  name: string;
  value: string;
  scopeUrlContains?: string;
  enabled: boolean;
  createdAt: string;
};

export type ParsedRuleValidation = {
  timestamp: string;
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; details: string }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isMatchedRule = (value: unknown): value is StoredMatchedRule => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.ruleId === "string" &&
    typeof value.ruleName === "string" &&
    typeof value.type === "string"
  );
};

// ---------------------------------------------------------------------------
// Rule parsers
// ---------------------------------------------------------------------------

export const parseRules = (raw: unknown): ParsedRule[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isRule);
};

const isRule = (value: unknown): value is ParsedRule => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    typeof value.enabled === "boolean" &&
    typeof value.priority === "number" &&
    (value.groupId === undefined || typeof value.groupId === "string") &&
    typeof value.createdAt === "string" &&
    isObject(value.condition) &&
    isObject(value.payload)
  );
};

export const parseRuleGroups = (raw: unknown): ParsedRuleGroup[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isRuleGroup);
};

const isRuleGroup = (value: unknown): value is ParsedRuleGroup => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.enabled === "boolean" &&
    typeof value.priority === "number" &&
    typeof value.createdAt === "string"
  );
};

// ---------------------------------------------------------------------------
// Captured request parser
// ---------------------------------------------------------------------------

export const parseCapturedRequests = (raw: unknown): ParsedCapturedRequest[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isCapturedRequest);
};

const isCapturedRequest = (value: unknown): value is ParsedCapturedRequest => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.method === "string" &&
    typeof value.url === "string" &&
    isObject(value.headers) &&
    (value.body === undefined || typeof value.body === "string") &&
    typeof value.timestamp === "string" &&
    (value.captureSource === "network" || value.captureSource === "mock") &&
    typeof value.startedAtMs === "number" &&
    Array.isArray(value.matchedRules) &&
    (value.matchedRules as unknown[]).every(isMatchedRule)
  );
};

// ---------------------------------------------------------------------------
// Response assertions parser
// ---------------------------------------------------------------------------

export const parseResponseAssertions = (raw: unknown): ParsedResponseAssertion[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isResponseAssertion);
};

const isResponseAssertion = (value: unknown): value is ParsedResponseAssertion => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    (value.type === "status" ||
      value.type === "header" ||
      value.type === "json-path" ||
      value.type === "body-contains") &&
    typeof value.enabled === "boolean" &&
    value.expected !== undefined &&
    (value.path === undefined || typeof value.path === "string") &&
    (value.actual === undefined ||
      typeof value.actual === "string" ||
      typeof value.actual === "number") &&
    (value.error === undefined || typeof value.error === "string") &&
    typeof value.createdAt === "string"
  );
};

// ---------------------------------------------------------------------------
// Mock env vars parser
// ---------------------------------------------------------------------------

export const parseMockEnvVars = (raw: unknown): ParsedMockEnvVar[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isMockEnvVar);
};

const isMockEnvVar = (value: unknown): value is ParsedMockEnvVar => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.value === "string" &&
    (value.scopeUrlContains === undefined || typeof value.scopeUrlContains === "string") &&
    typeof value.enabled === "boolean" &&
    typeof value.createdAt === "string"
  );
};

// ---------------------------------------------------------------------------
// Rule validation parser
// ---------------------------------------------------------------------------

export const parseRuleValidation = (raw: unknown): ParsedRuleValidation | null => {
  if (!isObject(raw)) {
    return null;
  }

  if (
    typeof raw.timestamp !== "string" ||
    typeof raw.passed !== "boolean" ||
    !Array.isArray(raw.checks)
  ) {
    return null;
  }

  const checks = (raw.checks as unknown[]).filter(
    (check): check is ParsedRuleValidation["checks"][number] =>
      isObject(check) &&
      typeof check.name === "string" &&
      typeof check.passed === "boolean" &&
      typeof check.details === "string"
  );

  return { timestamp: raw.timestamp, passed: raw.passed, checks };
};
