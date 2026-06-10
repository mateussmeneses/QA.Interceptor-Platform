import { describe, it, expect } from "vitest";
import type { Rule, InterceptedRequest } from "@qa-interceptor/shared-types";
import { evaluateRules } from "./index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRule = (overrides: Partial<Rule> = {}): Rule => ({
  id: "rule-1",
  name: "Default Rule",
  type: "block",
  enabled: true,
  priority: 10,
  createdAt: "2026-01-01T00:00:00.000Z",
  condition: {},
  payload: {},
  ...overrides
});

const makeRequest = (overrides: Partial<InterceptedRequest> = {}): InterceptedRequest => ({
  id: "req-1",
  method: "GET",
  url: "https://example.com/api/orders",
  headers: {},
  timestamp: "2026-01-01T10:00:00.000Z",
  ...overrides
});

// ---------------------------------------------------------------------------
// evaluateRules — basic behaviour
// ---------------------------------------------------------------------------

describe("evaluateRules", () => {
  it("returns the requestId from the incoming request", () => {
    const result = evaluateRules([], makeRequest({ id: "req-abc" }));
    expect(result.requestId).toBe("req-abc");
  });

  it("returns empty matchedRules when no rules exist", () => {
    const result = evaluateRules([], makeRequest());
    expect(result.matchedRules).toHaveLength(0);
  });

  it("returns empty matchedRules when all rules are disabled", () => {
    const rules = [
      makeRule({ id: "r1", enabled: false }),
      makeRule({ id: "r2", enabled: false })
    ];
    const result = evaluateRules(rules, makeRequest());
    expect(result.matchedRules).toHaveLength(0);
  });

  it("matches an enabled rule with no conditions against any request", () => {
    const rule = makeRule({ id: "r1", condition: {} });
    const result = evaluateRules([rule], makeRequest());
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0].ruleId).toBe("r1");
  });

  it("does not match a disabled rule even when conditions match", () => {
    const rule = makeRule({ enabled: false, condition: { urlContains: "/api" } });
    const result = evaluateRules([rule], makeRequest({ url: "https://example.com/api/orders" }));
    expect(result.matchedRules).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Condition matching — urlContains
// ---------------------------------------------------------------------------

describe("condition: urlContains", () => {
  it("matches when URL contains the substring", () => {
    const rule = makeRule({ condition: { urlContains: "/api" } });
    const result = evaluateRules([rule], makeRequest({ url: "https://example.com/api/orders" }));
    expect(result.matchedRules).toHaveLength(1);
  });

  it("does not match when URL does not contain the substring", () => {
    const rule = makeRule({ condition: { urlContains: "/checkout" } });
    const result = evaluateRules([rule], makeRequest({ url: "https://example.com/api/orders" }));
    expect(result.matchedRules).toHaveLength(0);
  });

  it("matches an exact segment", () => {
    const rule = makeRule({ condition: { urlContains: "/api/orders" } });
    const result = evaluateRules([rule], makeRequest({ url: "https://example.com/api/orders" }));
    expect(result.matchedRules).toHaveLength(1);
  });

  it("does not match a partial segment that is not in the URL", () => {
    const rule = makeRule({ condition: { urlContains: "/api/users" } });
    const result = evaluateRules([rule], makeRequest({ url: "https://example.com/api/orders" }));
    expect(result.matchedRules).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Condition matching — method
// ---------------------------------------------------------------------------

describe("condition: method", () => {
  it("matches when method is equal", () => {
    const rule = makeRule({ condition: { method: "POST" } });
    const result = evaluateRules([rule], makeRequest({ method: "POST" }));
    expect(result.matchedRules).toHaveLength(1);
  });

  it("does not match when method differs", () => {
    const rule = makeRule({ condition: { method: "DELETE" } });
    const result = evaluateRules([rule], makeRequest({ method: "GET" }));
    expect(result.matchedRules).toHaveLength(0);
  });

  it("matches all methods when condition.method is omitted", () => {
    const rule = makeRule({ condition: {} });
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

    for (const method of methods) {
      const result = evaluateRules([rule], makeRequest({ method }));
      expect(result.matchedRules).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Condition matching — combined method + urlContains
// ---------------------------------------------------------------------------

describe("condition: method + urlContains combined", () => {
  const rule = makeRule({
    condition: { method: "POST", urlContains: "/checkout" }
  });

  it("matches when both method and URL match", () => {
    const result = evaluateRules(
      [rule],
      makeRequest({ method: "POST", url: "https://example.com/checkout" })
    );
    expect(result.matchedRules).toHaveLength(1);
  });

  it("does not match when method matches but URL does not", () => {
    const result = evaluateRules(
      [rule],
      makeRequest({ method: "POST", url: "https://example.com/api/orders" })
    );
    expect(result.matchedRules).toHaveLength(0);
  });

  it("does not match when URL matches but method does not", () => {
    const result = evaluateRules(
      [rule],
      makeRequest({ method: "GET", url: "https://example.com/checkout" })
    );
    expect(result.matchedRules).toHaveLength(0);
  });

  it("does not match when neither matches", () => {
    const result = evaluateRules(
      [rule],
      makeRequest({ method: "GET", url: "https://example.com/api/orders" })
    );
    expect(result.matchedRules).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Priority and ordering
// ---------------------------------------------------------------------------

describe("priority ordering", () => {
  it("returns matched rules sorted by ascending priority", () => {
    const rules = [
      makeRule({ id: "low", priority: 90, condition: {} }),
      makeRule({ id: "high", priority: 1, condition: {} }),
      makeRule({ id: "mid", priority: 50, condition: {} })
    ];
    const result = evaluateRules(rules, makeRequest());
    expect(result.matchedRules.map((r) => r.ruleId)).toEqual(["high", "mid", "low"]);
  });

  it("breaks priority ties by createdAt ascending", () => {
    const rules = [
      makeRule({ id: "newer", priority: 10, createdAt: "2026-06-10T00:01:00.000Z", condition: {} }),
      makeRule({ id: "older", priority: 10, createdAt: "2026-06-10T00:00:00.000Z", condition: {} })
    ];
    const result = evaluateRules(rules, makeRequest());
    expect(result.matchedRules.map((r) => r.ruleId)).toEqual(["older", "newer"]);
  });

  it("does not include disabled rules in the sorted output", () => {
    const rules = [
      makeRule({ id: "enabled-low", priority: 90, enabled: true, condition: {} }),
      makeRule({ id: "disabled-high", priority: 1, enabled: false, condition: {} }),
      makeRule({ id: "enabled-mid", priority: 50, enabled: true, condition: {} })
    ];
    const result = evaluateRules(rules, makeRequest());
    expect(result.matchedRules.map((r) => r.ruleId)).toEqual(["enabled-mid", "enabled-low"]);
  });
});

// ---------------------------------------------------------------------------
// MatchedRule shape
// ---------------------------------------------------------------------------

describe("MatchedRule shape", () => {
  it("exposes ruleId, ruleName, type, and payload", () => {
    const rule = makeRule({
      id: "r-shape",
      name: "My Rule",
      type: "delay",
      payload: { delayMs: 500 },
      condition: {}
    });
    const result = evaluateRules([rule], makeRequest());
    const matched = result.matchedRules[0];

    expect(matched.ruleId).toBe("r-shape");
    expect(matched.ruleName).toBe("My Rule");
    expect(matched.type).toBe("delay");
    expect(matched.payload).toEqual({ delayMs: 500 });
  });

  it("does not mutate the original rule payload", () => {
    const payload = { delayMs: 300 };
    const rule = makeRule({ payload, condition: {} });
    evaluateRules([rule], makeRequest());
    expect(payload).toEqual({ delayMs: 300 });
  });
});

// ---------------------------------------------------------------------------
// Multiple matching rules
// ---------------------------------------------------------------------------

describe("multiple matching rules", () => {
  it("returns all matching rules for a single request", () => {
    const rules = [
      makeRule({ id: "r1", condition: { urlContains: "/api" } }),
      makeRule({ id: "r2", condition: { urlContains: "/orders" } }),
      makeRule({ id: "r3", condition: { urlContains: "/checkout" } })
    ];
    const result = evaluateRules(
      rules,
      makeRequest({ url: "https://example.com/api/orders" })
    );
    const ids = result.matchedRules.map((r) => r.ruleId);
    expect(ids).toContain("r1");
    expect(ids).toContain("r2");
    expect(ids).not.toContain("r3");
  });

  it("handles mixed enabled/disabled rules correctly", () => {
    const rules = [
      makeRule({ id: "enabled", enabled: true, condition: { urlContains: "/api" } }),
      makeRule({ id: "disabled", enabled: false, condition: { urlContains: "/api" } })
    ];
    const result = evaluateRules(
      rules,
      makeRequest({ url: "https://example.com/api/data" })
    );
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0].ruleId).toBe("enabled");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("handles empty urlContains string as a match-all wildcard", () => {
    const rule = makeRule({ condition: { urlContains: "" } });
    const result = evaluateRules([rule], makeRequest({ url: "https://example.com" }));
    expect(result.matchedRules).toHaveLength(1);
  });

  it("handles a rule list with only one entry", () => {
    const rule = makeRule({ id: "only", condition: { urlContains: "/api" } });
    const result = evaluateRules([rule], makeRequest({ url: "https://x.com/api" }));
    expect(result.matchedRules).toHaveLength(1);
  });

  it("is deterministic across identical rule sets", () => {
    const rules = [
      makeRule({ id: "a", priority: 5, condition: {} }),
      makeRule({ id: "b", priority: 3, condition: {} }),
      makeRule({ id: "c", priority: 7, condition: {} })
    ];
    const r1 = evaluateRules(rules, makeRequest());
    const r2 = evaluateRules(rules, makeRequest());
    expect(r1.matchedRules.map((r) => r.ruleId)).toEqual(r2.matchedRules.map((r) => r.ruleId));
  });
});

// ---------------------------------------------------------------------------
// New rule types: rewrite-query and rewrite-response
// ---------------------------------------------------------------------------

describe("rule type: rewrite-query", () => {
  it("matches a rewrite-query rule by urlContains", () => {
    const rule = makeRule({
      type: "rewrite-query",
      condition: { urlContains: "/checkout" },
      payload: { addOrReplace: [{ key: "env", value: "test" }] }
    });
    const result = evaluateRules(
      [rule],
      makeRequest({ url: "https://example.com/checkout" })
    );
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0].type).toBe("rewrite-query");
  });

  it("does not match a rewrite-query rule when URL does not match", () => {
    const rule = makeRule({
      type: "rewrite-query",
      condition: { urlContains: "/checkout" },
      payload: { addOrReplace: [{ key: "env", value: "test" }] }
    });
    const result = evaluateRules(
      [rule],
      makeRequest({ url: "https://example.com/api/orders" })
    );
    expect(result.matchedRules).toHaveLength(0);
  });

  it("exposes the payload on the matched rule", () => {
    const payload = { addOrReplace: [{ key: "env", value: "qa" }], remove: ["debug"] };
    const rule = makeRule({ type: "rewrite-query", condition: {}, payload });
    const result = evaluateRules([rule], makeRequest());
    expect(result.matchedRules[0].payload).toEqual(payload);
  });
});

describe("rule type: rewrite-response", () => {
  it("matches a rewrite-response rule by urlContains", () => {
    const rule = makeRule({
      type: "rewrite-response",
      condition: { urlContains: "/api/orders" },
      payload: { body: '{"ok":true}' }
    });
    const result = evaluateRules(
      [rule],
      makeRequest({ url: "https://example.com/api/orders" })
    );
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0].type).toBe("rewrite-response");
  });

  it("can coexist with other rule types in the same match", () => {
    const rules = [
      makeRule({ id: "rr", type: "rewrite-response", condition: { urlContains: "/api" }, payload: { body: "{}" } }),
      makeRule({ id: "rq", type: "rewrite-query", condition: { urlContains: "/api" }, payload: { addOrReplace: [{ key: "x", value: "1" }] } })
    ];
    const result = evaluateRules(rules, makeRequest({ url: "https://example.com/api/orders" }));
    const types = result.matchedRules.map((r) => r.type);
    expect(types).toContain("rewrite-response");
    expect(types).toContain("rewrite-query");
  });
});

// ---------------------------------------------------------------------------
// New rule type: rewrite-request-body
// ---------------------------------------------------------------------------

describe("rule type: rewrite-request-body", () => {
  it("matches a rewrite-request-body rule by urlContains", () => {
    const rule = makeRule({
      type: "rewrite-request-body",
      condition: { urlContains: "/api/orders" },
      payload: { body: '{"items":[]}' }
    });
    const result = evaluateRules(
      [rule],
      makeRequest({ url: "https://example.com/api/orders" })
    );
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0].type).toBe("rewrite-request-body");
  });

  it("does not match when URL does not contain the substring", () => {
    const rule = makeRule({
      type: "rewrite-request-body",
      condition: { urlContains: "/api/orders" },
      payload: { body: '{"items":[]}' }
    });
    const result = evaluateRules(
      [rule],
      makeRequest({ url: "https://example.com/api/users" })
    );
    expect(result.matchedRules).toHaveLength(0);
  });

  it("matches only POST when method condition is POST", () => {
    const rule = makeRule({
      type: "rewrite-request-body",
      condition: { method: "POST", urlContains: "/api" },
      payload: { body: "{}" }
    });
    const postResult = evaluateRules([rule], makeRequest({ method: "POST", url: "https://example.com/api/orders" }));
    const getResult = evaluateRules([rule], makeRequest({ method: "GET", url: "https://example.com/api/orders" }));
    expect(postResult.matchedRules).toHaveLength(1);
    expect(getResult.matchedRules).toHaveLength(0);
  });

  it("exposes body payload on the matched rule", () => {
    const payload = { body: '{"patched":true}', contentType: "application/json" };
    const rule = makeRule({ type: "rewrite-request-body", condition: {}, payload });
    const result = evaluateRules([rule], makeRequest());
    expect(result.matchedRules[0].payload).toEqual(payload);
  });
});
