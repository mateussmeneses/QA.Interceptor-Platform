/**
 * Content-script-safe rule and mock type guards.
 *
 * Pure functions only — no chrome API, no DOM. Shared by the extension's
 * injector and mock-bridge so that rule / env-var / conditional-mock validation
 * lives in a single place instead of being copy-pasted into each content script.
 *
 * Types are intentionally "loose" (method/type as string) because content
 * scripts consume values coming from untyped chrome.storage and postMessage.
 */

export type ContentRuleCondition = {
  urlContains?: string;
  method?: string;
};

export type ContentRule = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  createdAt: string;
  condition: ContentRuleCondition;
  payload: Record<string, unknown>;
};

export type ContentMockEnvVar = {
  id: string;
  name: string;
  value: string;
  scopeUrlContains?: string;
  enabled: boolean;
  createdAt: string;
};

export type ContentConditionalMockBranch = {
  id: string;
  status: number;
  body: string;
};

export type ContentConditionalMock = {
  id: string;
  name: string;
  enabled: boolean;
  urlContains: string;
  method?: string;
  branches: ContentConditionalMockBranch[];
  createdAt: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const isContentRule = (value: unknown): value is ContentRule => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    typeof value.enabled === "boolean" &&
    typeof value.priority === "number" &&
    typeof value.createdAt === "string" &&
    isObject(value.condition) &&
    isObject(value.payload)
  );
};

export const isContentMockEnvVar = (value: unknown): value is ContentMockEnvVar => {
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

export const isContentConditionalMock = (value: unknown): value is ContentConditionalMock => {
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
    Array.isArray(value.branches)
  );
};
