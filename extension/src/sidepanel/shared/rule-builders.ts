/**
 * Pure editor → Rule builders (QAI-008).
 *
 * These functions assemble a domain `Rule` from raw editor field values. They
 * are pure and fully unit-tested so the assembly logic cannot silently drop a
 * field (the TD-018 bug class, where the save handler ignored `type`). The
 * feature modules (`features/rules.ts`, `features/mocks.ts`) delegate to them
 * and only handle DOM reads/writes.
 */

import type { RuleRow, HttpMethod } from "./types";
import { isRuleType } from "./types";

// ---------------------------------------------------------------------------
// Rule editor → Rule
// ---------------------------------------------------------------------------

export type RuleEditorValues = {
  name: string;
  type: string;
  /** "true" | "false" from a select. */
  enabled: string;
  priority: string;
  method: string;
  groupId: string;
  urlContains: string;
  payloadJson: string;
};

export type RuleBuildResult = { ok: true; rule: RuleRow } | { ok: false; error: string };

const parsePayloadObject = (
  raw: string
): { value: Record<string, unknown> } | { error: string } => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw || "{}");
  } catch {
    return { error: "Payload JSON is invalid. Fix it before saving." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "Payload must be a JSON object." };
  }

  return { value: parsed as Record<string, unknown> };
};

const normalizePriority = (raw: string): number => {
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

/**
 * Builds the next Rule from the rule editor values, preserving the rest of the
 * current rule. Validates the payload JSON. The `type` is read and persisted
 * (regression guard for TD-018).
 */
export const buildRuleFromEditorValues = (
  current: RuleRow,
  values: RuleEditorValues
): RuleBuildResult => {
  const payload = parsePayloadObject(values.payloadJson);

  if ("error" in payload) {
    return { ok: false, error: payload.error };
  }

  const methodValue = values.method.trim().toUpperCase();
  const groupValue = values.groupId.trim();
  const urlContainsValue = values.urlContains.trim();
  const typeValue = isRuleType(values.type) ? values.type : current.type;

  return {
    ok: true,
    rule: {
      ...current,
      name: values.name.trim() || current.name,
      type: typeValue,
      enabled: values.enabled === "true",
      priority: normalizePriority(values.priority),
      ...(groupValue ? { groupId: groupValue } : { groupId: undefined }),
      condition: {
        ...(methodValue ? { method: methodValue as HttpMethod } : {}),
        ...(urlContainsValue ? { urlContains: urlContainsValue } : {})
      },
      payload: payload.value
    }
  };
};

// ---------------------------------------------------------------------------
// Mock editor → Rule
// ---------------------------------------------------------------------------

export type MockEditorValues = {
  /** "true" | "false" from a select. */
  enabled: string;
  method: string;
  urlContains: string;
  httpStatus: string;
  delayMs: string;
  headersJson: string;
  bodyText: string;
};

const parseHeaders = (raw: string): { value: Record<string, string> } | { error: string } => {
  if (!raw.trim()) {
    return { value: {} };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Headers JSON is invalid." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "Headers must be a JSON object." };
  }

  return {
    value: Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)])
    )
  };
};

/**
 * Builds the next mock Rule from the mock editor values, preserving the rest of
 * the current rule. Validates HTTP status and headers JSON. Body is only set
 * for `mock-response`.
 */
export const buildMockFromEditorValues = (
  current: RuleRow,
  values: MockEditorValues
): RuleBuildResult => {
  const nextStatus = Number.parseInt(values.httpStatus, 10);

  if (!Number.isFinite(nextStatus) || nextStatus < 100 || nextStatus > 599) {
    return { ok: false, error: "HTTP status must be a number between 100 and 599." };
  }

  const headers = parseHeaders(values.headersJson);

  if ("error" in headers) {
    return { ok: false, error: headers.error };
  }

  const nextDelayRaw = Number.parseInt(values.delayMs || "0", 10);
  const nextDelay = Number.isFinite(nextDelayRaw) && nextDelayRaw > 0 ? nextDelayRaw : 0;

  let nextBody: unknown = "";

  if (values.bodyText.trim()) {
    try {
      nextBody = JSON.parse(values.bodyText);
    } catch {
      nextBody = values.bodyText;
    }
  }

  const methodValue = values.method.trim().toUpperCase();
  const urlContainsValue = values.urlContains.trim();

  const payload: Record<string, unknown> = {
    ...(current.payload ?? {}),
    status: nextStatus,
    ...(nextDelay > 0 ? { delayMs: nextDelay } : {}),
    ...(Object.keys(headers.value).length > 0 ? { headers: headers.value } : {})
  };

  if (current.type === "mock-response") {
    payload.body = nextBody;
  }

  return {
    ok: true,
    rule: {
      ...current,
      enabled: values.enabled === "true",
      condition: {
        ...(methodValue ? { method: methodValue as HttpMethod } : {}),
        ...(urlContainsValue ? { urlContains: urlContainsValue } : {})
      },
      payload
    }
  };
};
