import { describe, it, expect } from "vitest";
import {
  buildRuleFromEditorValues,
  buildMockFromEditorValues,
  type RuleEditorValues,
  type MockEditorValues
} from "./rule-builders";
import type { RuleRow } from "./types";

const baseRule: RuleRow = {
  id: "r1",
  name: "Existing",
  type: "delay",
  enabled: false,
  priority: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
  condition: { urlContains: "/api" },
  payload: { delayMs: 500 }
};

const ruleValues = (over: Partial<RuleEditorValues> = {}): RuleEditorValues => ({
  name: "My Rule",
  type: "block",
  enabled: "true",
  priority: "50",
  method: "post",
  groupId: "",
  urlContains: "/orders",
  payloadJson: "{}",
  ...over
});

describe("buildRuleFromEditorValues", () => {
  it("persists the type field (TD-018 regression guard)", () => {
    const result = buildRuleFromEditorValues(baseRule, ruleValues({ type: "redirect" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rule.type).toBe("redirect");
    }
  });

  it("falls back to the current type when the value is not a valid RuleType", () => {
    const result = buildRuleFromEditorValues(baseRule, ruleValues({ type: "nonsense" }));
    expect(result.ok && result.rule.type).toBe("delay");
  });

  it("uppercases the method and trims URL", () => {
    const result = buildRuleFromEditorValues(
      baseRule,
      ruleValues({ method: "put", urlContains: "  /checkout  " })
    );
    expect(result.ok && result.rule.condition).toEqual({
      method: "PUT",
      urlContains: "/checkout"
    });
  });

  it("omits method/urlContains when empty (method-only or url-only allowed)", () => {
    const result = buildRuleFromEditorValues(baseRule, ruleValues({ method: "", urlContains: "" }));
    expect(result.ok && result.rule.condition).toEqual({});
  });

  it("normalizes a non-positive or invalid priority to 1", () => {
    expect(
      buildRuleFromEditorValues(baseRule, ruleValues({ priority: "0" })).ok &&
        buildRuleFromEditorValues(baseRule, ruleValues({ priority: "0" }))
    ).toMatchObject({ rule: { priority: 1 } });
    expect(
      buildRuleFromEditorValues(baseRule, ruleValues({ priority: "abc" })).ok &&
        buildRuleFromEditorValues(baseRule, ruleValues({ priority: "abc" }))
    ).toMatchObject({ rule: { priority: 1 } });
  });

  it("keeps the current name when the new name is blank", () => {
    const result = buildRuleFromEditorValues(baseRule, ruleValues({ name: "   " }));
    expect(result.ok && result.rule.name).toBe("Existing");
  });

  it("rejects invalid payload JSON", () => {
    const result = buildRuleFromEditorValues(baseRule, ruleValues({ payloadJson: "{" }));
    expect(result).toEqual({ ok: false, error: "Payload JSON is invalid. Fix it before saving." });
  });

  it("rejects a payload that is not an object", () => {
    const result = buildRuleFromEditorValues(baseRule, ruleValues({ payloadJson: "[1,2]" }));
    expect(result).toEqual({ ok: false, error: "Payload must be a JSON object." });
  });

  it("sets groupId when provided and clears it when blank", () => {
    expect(
      buildRuleFromEditorValues(baseRule, ruleValues({ groupId: "grp-1" })).ok &&
        buildRuleFromEditorValues(baseRule, ruleValues({ groupId: "grp-1" }))
    ).toMatchObject({ rule: { groupId: "grp-1" } });
    const cleared = buildRuleFromEditorValues(baseRule, ruleValues({ groupId: "" }));
    expect(cleared.ok && cleared.rule.groupId).toBeUndefined();
  });
});

const mockRule: RuleRow = {
  id: "m1",
  name: "Mock Orders",
  type: "mock-response",
  enabled: false,
  priority: 50,
  createdAt: "2026-01-01T00:00:00.000Z",
  condition: { urlContains: "/api/orders" },
  payload: { status: 200, body: "{}" }
};

const mockValues = (over: Partial<MockEditorValues> = {}): MockEditorValues => ({
  enabled: "true",
  method: "get",
  urlContains: "/api/orders",
  httpStatus: "201",
  delayMs: "0",
  headersJson: "",
  bodyText: '{"ok":true}',
  ...over
});

describe("buildMockFromEditorValues", () => {
  it("builds a mock-response rule with status, body and condition", () => {
    const result = buildMockFromEditorValues(mockRule, mockValues());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rule.payload).toMatchObject({ status: 201, body: { ok: true } });
      expect(result.rule.condition).toEqual({ method: "GET", urlContains: "/api/orders" });
    }
  });

  it("rejects an out-of-range HTTP status", () => {
    expect(buildMockFromEditorValues(mockRule, mockValues({ httpStatus: "99" }))).toEqual({
      ok: false,
      error: "HTTP status must be a number between 100 and 599."
    });
    expect(buildMockFromEditorValues(mockRule, mockValues({ httpStatus: "700" })).ok).toBe(false);
  });

  it("rejects invalid headers JSON", () => {
    expect(buildMockFromEditorValues(mockRule, mockValues({ headersJson: "{bad" }))).toEqual({
      ok: false,
      error: "Headers JSON is invalid."
    });
  });

  it("includes delayMs only when positive", () => {
    const withDelay = buildMockFromEditorValues(mockRule, mockValues({ delayMs: "250" }));
    expect(withDelay.ok && withDelay.rule.payload).toMatchObject({ delayMs: 250 });
  });

  it("treats a non-JSON body as a raw string", () => {
    const result = buildMockFromEditorValues(mockRule, mockValues({ bodyText: "plain text" }));
    expect(result.ok && result.rule.payload).toMatchObject({ body: "plain text" });
  });

  it("does not set a body for a mock-status rule", () => {
    const statusRule: RuleRow = { ...mockRule, type: "mock-status", payload: { status: 200 } };
    const result = buildMockFromEditorValues(statusRule, mockValues({ bodyText: "ignored" }));
    expect(result.ok && "body" in (result.rule.payload as Record<string, unknown>)).toBe(false);
  });

  it("coerces header values to strings", () => {
    const result = buildMockFromEditorValues(
      mockRule,
      mockValues({ headersJson: '{"x-count": 5}' })
    );
    expect(result.ok && result.rule.payload).toMatchObject({ headers: { "x-count": "5" } });
  });
});
