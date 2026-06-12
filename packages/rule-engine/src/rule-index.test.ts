import { describe, it, expect } from "vitest";
import { buildRuleIndex, evaluateRulesFromIndex, computeRuleFingerprint } from "./rule-index";
import type { Rule, InterceptedRequest } from "@qa-interceptor/shared-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRule = (
  overrides: Partial<Rule> & { id: string; type: Rule["type"] }
): Rule => ({
  name: overrides.id,
  enabled: true,
  priority: 10,
  createdAt: "2026-01-01T00:00:00.000Z",
  condition: {},
  payload: {},
  groupId: undefined,
  ...overrides,
});

const makeRequest = (overrides: Partial<InterceptedRequest> = {}): InterceptedRequest => ({
  id: "req-1",
  method: "GET",
  url: "https://api.example.com/users",
  headers: {},
  timestamp: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// buildRuleIndex
// ---------------------------------------------------------------------------

describe("buildRuleIndex", () => {
  it("builds an empty index from no rules", () => {
    const index = buildRuleIndex([]);
    expect(index.sortedRules).toHaveLength(0);
    expect(index.universalRules).toHaveLength(0);
    expect(index.urlBuckets.size).toBe(0);
    expect(index.terminalRules).toHaveLength(0);
  });

  it("excludes disabled rules", () => {
    const rules = [
      makeRule({ id: "r1", type: "mock-response", enabled: false }),
      makeRule({ id: "r2", type: "mock-response", enabled: true }),
    ];
    const index = buildRuleIndex(rules);
    expect(index.sortedRules).toHaveLength(1);
    expect(index.sortedRules[0]?.id).toBe("r2");
  });

  it("sorts rules by priority ascending", () => {
    const rules = [
      makeRule({ id: "r1", type: "mock-response", priority: 20 }),
      makeRule({ id: "r2", type: "mock-response", priority: 5 }),
      makeRule({ id: "r3", type: "mock-response", priority: 10 }),
    ];
    const index = buildRuleIndex(rules);
    expect(index.sortedRules.map((r) => r.id)).toEqual(["r2", "r3", "r1"]);
  });

  it("breaks priority ties by createdAt ascending", () => {
    const rules = [
      makeRule({ id: "r1", type: "delay", priority: 10, createdAt: "2026-01-02T00:00:00.000Z" }),
      makeRule({ id: "r2", type: "delay", priority: 10, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const index = buildRuleIndex(rules);
    expect(index.sortedRules[0]?.id).toBe("r2"); // older first
  });

  it("puts rules with no URL condition in universalRules", () => {
    const rules = [
      makeRule({ id: "r1", type: "delay", condition: {} }),
      makeRule({ id: "r2", type: "delay", condition: { urlContains: "/api" } }),
    ];
    const index = buildRuleIndex(rules);
    expect(index.universalRules).toHaveLength(1);
    expect(index.universalRules[0]?.id).toBe("r1");
  });

  it("buckets rules by urlContains key", () => {
    const rules = [
      makeRule({ id: "r1", type: "mock-response", condition: { urlContains: "/api" } }),
      makeRule({ id: "r2", type: "mock-status", condition: { urlContains: "/api" } }),
      makeRule({ id: "r3", type: "block", condition: { urlContains: "/admin" } }),
    ];
    const index = buildRuleIndex(rules);
    expect(index.urlBuckets.get("/api")).toHaveLength(2);
    expect(index.urlBuckets.get("/admin")).toHaveLength(1);
  });

  it("populates terminalRules with block and redirect types", () => {
    const rules = [
      makeRule({ id: "r1", type: "block" }),
      makeRule({ id: "r2", type: "redirect" }),
      makeRule({ id: "r3", type: "mock-response" }),
    ];
    const index = buildRuleIndex(rules);
    expect(index.terminalRules).toHaveLength(2);
    expect(index.terminalRules.map((r) => r.type).sort()).toEqual(["block", "redirect"]);
  });

  it("sets builtAtMs to a recent timestamp", () => {
    const before = Date.now();
    const index = buildRuleIndex([]);
    const after = Date.now();
    expect(index.builtAtMs).toBeGreaterThanOrEqual(before);
    expect(index.builtAtMs).toBeLessThanOrEqual(after);
  });

  it("does not mutate the input array", () => {
    const rules = [
      makeRule({ id: "r1", type: "mock-response", priority: 20 }),
      makeRule({ id: "r2", type: "mock-response", priority: 5 }),
    ];
    const copy = rules.map((r) => r.id);
    buildRuleIndex(rules);
    expect(rules.map((r) => r.id)).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// evaluateRulesFromIndex
// ---------------------------------------------------------------------------

describe("evaluateRulesFromIndex", () => {
  it("returns empty matchedRules when no rules exist", () => {
    const index = buildRuleIndex([]);
    const result = evaluateRulesFromIndex(index, makeRequest());
    expect(result.matchedRules).toHaveLength(0);
  });

  it("returns requestId from request", () => {
    const index = buildRuleIndex([]);
    const result = evaluateRulesFromIndex(index, makeRequest({ id: "my-req" }));
    expect(result.requestId).toBe("my-req");
  });

  it("matches rule with no conditions (universal match)", () => {
    const index = buildRuleIndex([makeRule({ id: "r1", type: "delay" })]);
    const result = evaluateRulesFromIndex(index, makeRequest());
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0]?.ruleId).toBe("r1");
  });

  it("matches rule by urlContains", () => {
    const rules = [
      makeRule({ id: "r1", type: "mock-response", condition: { urlContains: "/users" } }),
      makeRule({ id: "r2", type: "mock-response", condition: { urlContains: "/orders" } }),
    ];
    const index = buildRuleIndex(rules);
    const result = evaluateRulesFromIndex(index, makeRequest({ url: "https://api.example.com/users/1" }));
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0]?.ruleId).toBe("r1");
  });

  it("matches rule by method", () => {
    const rules = [
      makeRule({ id: "r1", type: "rewrite-header", condition: { method: "POST" } }),
      makeRule({ id: "r2", type: "rewrite-header", condition: { method: "GET" } }),
    ];
    const index = buildRuleIndex(rules);
    const result = evaluateRulesFromIndex(index, makeRequest({ method: "GET" }));
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0]?.ruleId).toBe("r2");
  });

  it("respects priority order in matched rules", () => {
    const rules = [
      makeRule({ id: "r1", type: "delay", priority: 20 }),
      makeRule({ id: "r2", type: "mock-response", priority: 5 }),
    ];
    const index = buildRuleIndex(rules);
    const result = evaluateRulesFromIndex(index, makeRequest());
    expect(result.matchedRules[0]?.ruleId).toBe("r2"); // priority 5 first
    expect(result.matchedRules[1]?.ruleId).toBe("r1"); // priority 20 second
  });

  it("early-exits on block rule — no subsequent rules executed", () => {
    const rules = [
      makeRule({ id: "block", type: "block", priority: 1 }),
      makeRule({ id: "mock", type: "mock-response", priority: 10 }),
    ];
    const index = buildRuleIndex(rules);
    const result = evaluateRulesFromIndex(index, makeRequest());
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0]?.ruleId).toBe("block");
  });

  it("early-exits on redirect rule", () => {
    const rules = [
      makeRule({ id: "redirect", type: "redirect", priority: 1 }),
      makeRule({ id: "delay", type: "delay", priority: 20 }),
    ];
    const index = buildRuleIndex(rules);
    const result = evaluateRulesFromIndex(index, makeRequest());
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0]?.ruleId).toBe("redirect");
  });

  it("does NOT early-exit on non-terminal rules", () => {
    const rules = [
      makeRule({ id: "r1", type: "rewrite-header", priority: 1 }),
      makeRule({ id: "r2", type: "mock-response", priority: 2 }),
      makeRule({ id: "r3", type: "delay", priority: 3 }),
    ];
    const index = buildRuleIndex(rules);
    const result = evaluateRulesFromIndex(index, makeRequest());
    expect(result.matchedRules).toHaveLength(3);
  });

  it("includes rule payload in matched result", () => {
    const rules = [makeRule({ id: "r1", type: "delay", payload: { delayMs: 500 } })];
    const index = buildRuleIndex(rules);
    const result = evaluateRulesFromIndex(index, makeRequest());
    expect(result.matchedRules[0]?.payload).toEqual({ delayMs: 500 });
  });

  it("handles 1000 rules efficiently (smoke)", () => {
    const rules = Array.from({ length: 1000 }, (_, i) =>
      makeRule({
        id: `r${String(i)}`,
        type: "rewrite-header",
        priority: i,
        condition: { urlContains: `/api/resource-${String(i)}` },
      })
    );
    const index = buildRuleIndex(rules);
    const start = performance.now();
    evaluateRulesFromIndex(index, makeRequest({ url: "https://api.example.com/api/resource-500" }));
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(10); // < 10ms even for 1000 rules
  });
});

// ---------------------------------------------------------------------------
// computeRuleFingerprint
// ---------------------------------------------------------------------------

describe("computeRuleFingerprint", () => {
  it("returns the same fingerprint for the same rule set", () => {
    const rules = [
      makeRule({ id: "r1", type: "delay", priority: 10 }),
      makeRule({ id: "r2", type: "block", priority: 5 }),
    ];
    expect(computeRuleFingerprint(rules)).toBe(computeRuleFingerprint(rules));
  });

  it("returns a different fingerprint when a rule is added", () => {
    const rules = [makeRule({ id: "r1", type: "delay" })];
    const extended = [...rules, makeRule({ id: "r2", type: "block" })];
    expect(computeRuleFingerprint(rules)).not.toBe(computeRuleFingerprint(extended));
  });

  it("returns a different fingerprint when a rule is removed", () => {
    const rules = [
      makeRule({ id: "r1", type: "delay" }),
      makeRule({ id: "r2", type: "block" }),
    ];
    const reduced = rules.slice(0, 1);
    expect(computeRuleFingerprint(rules)).not.toBe(computeRuleFingerprint(reduced));
  });

  it("returns a different fingerprint when priority changes", () => {
    const v1 = [makeRule({ id: "r1", type: "delay", priority: 5 })];
    const v2 = [makeRule({ id: "r1", type: "delay", priority: 20 })];
    expect(computeRuleFingerprint(v1)).not.toBe(computeRuleFingerprint(v2));
  });

  it("ignores disabled rules in fingerprint", () => {
    const active = [makeRule({ id: "r1", type: "delay", enabled: true })];
    const withDisabled = [
      makeRule({ id: "r1", type: "delay", enabled: true }),
      makeRule({ id: "r2", type: "block", enabled: false }),
    ];
    expect(computeRuleFingerprint(active)).toBe(computeRuleFingerprint(withDisabled));
  });

  it("returns empty fingerprint for empty array", () => {
    expect(computeRuleFingerprint([])).toMatch(/^0::/);
  });
});
