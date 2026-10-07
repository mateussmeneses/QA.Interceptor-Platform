/**
 * Typed runtime message contracts shared between background, content, and sidepanel.
 * All chrome.runtime.sendMessage payloads must conform to one of these types.
 */

import type { HttpMethod } from "./index";

// ---------------------------------------------------------------------------
// Shared sub-types
// ---------------------------------------------------------------------------

export type MatchedRuleSummary = {
  ruleId: string;
  ruleName: string;
  type: string;
  payload?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Page → Content → Background: mock or rewrite applied via fetch bridge
// ---------------------------------------------------------------------------

export type MockAppliedPayload = {
  requestId: string;
  method: string;
  url: string;
  timestamp: string;
  status: number;
  durationMs: number;
  responseBody?: string;
  matchedRules: MatchedRuleSummary[];
};

export type MockAppliedMessage = {
  type: "MOCK_APPLIED";
  payload: MockAppliedPayload;
};

// ---------------------------------------------------------------------------
// Content → Page: rules and env-vars update for the fetch bridge
// ---------------------------------------------------------------------------

export type RulesUpdateMessage = {
  source: "qa-interceptor-content";
  type: "RULES_UPDATE";
  rules: unknown[];
  envVars?: unknown[];
};

// ---------------------------------------------------------------------------
// Sidepanel → Background: replay or compose a request
// ---------------------------------------------------------------------------

export type RepeatRequestPayload = {
  method: HttpMethod | string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
};

export type RepeatRequestMessage = {
  type: "REPEAT_REQUEST";
  payload: RepeatRequestPayload;
};

export type RepeatRequestResponse =
  | { ok: true; status: number; headers?: Record<string, string>; body?: string }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Discriminated union of all runtime messages handled by background.ts
// ---------------------------------------------------------------------------

export type BackgroundMessage = MockAppliedMessage | RepeatRequestMessage;

// ---------------------------------------------------------------------------
// Type guard helpers
// ---------------------------------------------------------------------------

export const isMockAppliedMessage = (value: unknown): value is MockAppliedMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.type === "MOCK_APPLIED" && candidate.payload !== undefined;
};

export const isRepeatRequestMessage = (value: unknown): value is RepeatRequestMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    candidate.type !== "REPEAT_REQUEST" ||
    !candidate.payload ||
    typeof candidate.payload !== "object"
  ) {
    return false;
  }

  const payload = candidate.payload as Record<string, unknown>;
  return typeof payload.method === "string" && typeof payload.url === "string";
};

export const isRepeatRequestResponse = (value: unknown): value is RepeatRequestResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.ok === "boolean";
};
