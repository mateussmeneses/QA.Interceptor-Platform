/**
 * Storage abstraction layer.
 * All chrome.storage.local access must go through this module.
 * This centralises keys, read/write shapes, and default-value logic.
 */

import type { Rule, RuleGroup } from "../../../packages/shared-types/src/index";

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  CAPTURED_REQUESTS: "capturedRequests",
  RULES: "rules",
  RULE_GROUPS: "ruleGroups",
  RULE_VALIDATION: "ruleValidation",
  RESPONSE_ASSERTIONS: "responseAssertions",
  MOCK_ENV_VARS: "mockEnvVars",
  REPLAY_ARTIFACTS: "replayArtifacts",
  CONDITIONAL_MOCKS: "conditionalMocks"
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// ---------------------------------------------------------------------------
// Domain types stored in chrome.storage
// ---------------------------------------------------------------------------

export type StoredRuleValidation = {
  timestamp: string;
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
};

export type StoredMockEnvVar = {
  id: string;
  name: string;
  value: string;
  scopeUrlContains?: string;
  enabled: boolean;
  createdAt: string;
};

export type StoredResponseAssertion = {
  id: string;
  type: "status" | "header" | "json-path" | "body-contains" | "json-schema";
  enabled: boolean;
  expected: unknown;
  path?: string;
  actual?: unknown;
  error?: string;
  createdAt: string;
};

export type StoredMatchedRule = {
  ruleId: string;
  ruleName: string;
  type: string;
  payload?: Record<string, unknown>;
};

export type StoredCapturedResponse = {
  status: number;
  durationMs: number;
  timestamp: string;
  body?: string;
  headers?: Record<string, string>;
};

export type StoredCapturedRequest = {
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

export type StoredReplayArtifactRequest = {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
};

export type StoredReplayArtifact = {
  id: string;
  label: string;
  sourceSessionId: string;
  createdAt: string;
  requestCount: number;
  requests: StoredReplayArtifactRequest[];
};

/**
 * Sequence-based conditional mock (INT-005).
 * Each branch is the response for the nth matching call (1-indexed);
 * the last branch is reused as the fallback for all subsequent calls.
 */
export type StoredConditionalMockBranch = {
  id: string;
  status: number;
  body: string;
};

export type StoredConditionalMock = {
  id: string;
  name: string;
  enabled: boolean;
  urlContains: string;
  method?: string;
  branches: StoredConditionalMockBranch[];
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const isStoredRule = (value: unknown): value is Rule => {
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

export const isStoredRuleGroup = (value: unknown): value is RuleGroup => {
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

const isStoredMatchedRule = (value: unknown): value is StoredMatchedRule => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.ruleId === "string" &&
    typeof value.ruleName === "string" &&
    typeof value.type === "string"
  );
};

const isStoredReplayArtifactRequest = (value: unknown): value is StoredReplayArtifactRequest => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.method === "string" &&
    typeof value.url === "string" &&
    isObject(value.headers) &&
    (value.body === undefined || typeof value.body === "string")
  );
};

const isStoredReplayArtifact = (value: unknown): value is StoredReplayArtifact => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.sourceSessionId === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.requestCount === "number" &&
    Array.isArray(value.requests) &&
    (value.requests as unknown[]).every(isStoredReplayArtifactRequest)
  );
};

const isStoredConditionalMockBranch = (value: unknown): value is StoredConditionalMockBranch => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.status === "number" &&
    typeof value.body === "string"
  );
};

const isStoredConditionalMock = (value: unknown): value is StoredConditionalMock => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.enabled === "boolean" &&
    typeof value.urlContains === "string" &&
    (value.method === undefined || typeof value.method === "string") &&
    typeof value.createdAt === "string" &&
    Array.isArray(value.branches) &&
    (value.branches as unknown[]).every(isStoredConditionalMockBranch)
  );
};

export const isStoredCapturedRequest = (value: unknown): value is StoredCapturedRequest => {
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
    (value.matchedRules as unknown[]).every(isStoredMatchedRule)
  );
};

const isStoredMockEnvVar = (value: unknown): value is StoredMockEnvVar => {
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

const isStoredResponseAssertion = (value: unknown): value is StoredResponseAssertion => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    (value.type === "status" ||
      value.type === "header" ||
      value.type === "json-path" ||
      value.type === "body-contains" ||
      value.type === "json-schema") &&
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

const isStoredRuleValidation = (value: unknown): value is StoredRuleValidation => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.timestamp === "string" &&
    typeof value.passed === "boolean" &&
    Array.isArray(value.checks)
  );
};

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export const parseRules = (raw: unknown): Rule[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isStoredRule);
};

export const parseRuleGroups = (raw: unknown): RuleGroup[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isStoredRuleGroup);
};

export const parseCapturedRequests = (raw: unknown): StoredCapturedRequest[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isStoredCapturedRequest);
};

export const parseReplayArtifacts = (raw: unknown): StoredReplayArtifact[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isStoredReplayArtifact);
};

export const parseMockEnvVars = (raw: unknown): StoredMockEnvVar[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isStoredMockEnvVar);
};

export const parseResponseAssertions = (raw: unknown): StoredResponseAssertion[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isStoredResponseAssertion);
};

export const parseConditionalMocks = (raw: unknown): StoredConditionalMock[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isStoredConditionalMock);
};

export const parseRuleValidation = (raw: unknown): StoredRuleValidation | null => {
  if (!isStoredRuleValidation(raw)) {
    return null;
  }

  const checks = (raw.checks as unknown[]).filter(
    (check): check is StoredRuleValidation["checks"][number] =>
      isObject(check) &&
      typeof check.name === "string" &&
      typeof check.passed === "boolean" &&
      typeof check.details === "string"
  );

  return { timestamp: raw.timestamp, passed: raw.passed, checks };
};

// ---------------------------------------------------------------------------
// Typed read functions
// ---------------------------------------------------------------------------

export const loadRules = async (): Promise<Rule[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.RULES);
  return parseRules(stored[STORAGE_KEYS.RULES]);
};

export const saveRules = async (rules: Rule[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: rules });
};

export const loadRuleGroups = async (): Promise<RuleGroup[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.RULE_GROUPS);
  return parseRuleGroups(stored[STORAGE_KEYS.RULE_GROUPS]);
};

export const saveRuleGroups = async (groups: RuleGroup[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.RULE_GROUPS]: groups });
};

export const loadCapturedRequests = async (): Promise<StoredCapturedRequest[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.CAPTURED_REQUESTS);
  return parseCapturedRequests(stored[STORAGE_KEYS.CAPTURED_REQUESTS]);
};

export const saveCapturedRequests = async (requests: StoredCapturedRequest[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.CAPTURED_REQUESTS]: requests });
};

export const loadRuleValidation = async (): Promise<StoredRuleValidation | null> => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.RULE_VALIDATION);
  return parseRuleValidation(stored[STORAGE_KEYS.RULE_VALIDATION]);
};

export const saveRuleValidation = async (validation: StoredRuleValidation): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.RULE_VALIDATION]: validation });
};

export const loadMockEnvVars = async (): Promise<StoredMockEnvVar[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.MOCK_ENV_VARS);
  return parseMockEnvVars(stored[STORAGE_KEYS.MOCK_ENV_VARS]);
};

export const saveMockEnvVars = async (envVars: StoredMockEnvVar[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.MOCK_ENV_VARS]: envVars });
};

export const loadResponseAssertions = async (): Promise<StoredResponseAssertion[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.RESPONSE_ASSERTIONS);
  return parseResponseAssertions(stored[STORAGE_KEYS.RESPONSE_ASSERTIONS]);
};

export const saveResponseAssertions = async (
  assertions: StoredResponseAssertion[]
): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.RESPONSE_ASSERTIONS]: assertions });
};

export const loadConditionalMocks = async (): Promise<StoredConditionalMock[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.CONDITIONAL_MOCKS);
  return parseConditionalMocks(stored[STORAGE_KEYS.CONDITIONAL_MOCKS]);
};

export const saveConditionalMocks = async (mocks: StoredConditionalMock[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.CONDITIONAL_MOCKS]: mocks });
};

export const loadReplayArtifacts = async (): Promise<StoredReplayArtifact[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.REPLAY_ARTIFACTS);
  return parseReplayArtifacts(stored[STORAGE_KEYS.REPLAY_ARTIFACTS]);
};

export const saveReplayArtifacts = async (artifacts: StoredReplayArtifact[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.REPLAY_ARTIFACTS]: artifacts });
};
