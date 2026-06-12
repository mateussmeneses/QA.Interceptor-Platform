import { describe, it, expect } from "vitest";
import {
  parseRules,
  parseRuleGroups,
  parseCapturedRequests,
  parseResponseAssertions,
  parseMockEnvVars,
  parseRuleValidation,
} from "./storage-parsers.js";

// ---------------------------------------------------------------------------
// parseRules
// ---------------------------------------------------------------------------

describe("parseRules", () => {
  const validRule = {
    id: "r1",
    name: "Test Rule",
    type: "block",
    enabled: true,
    priority: 10,
    createdAt: "2026-01-01T00:00:00Z",
    condition: { urlContains: "/api" },
    payload: {},
  };

  it("returns empty array for non-array input", () => {
    expect(parseRules(null)).toHaveLength(0);
    expect(parseRules(undefined)).toHaveLength(0);
    expect(parseRules("string")).toHaveLength(0);
    expect(parseRules({})).toHaveLength(0);
  });

  it("returns empty array for empty array", () => {
    expect(parseRules([])).toHaveLength(0);
  });

  it("parses a valid rule", () => {
    const result = parseRules([validRule]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r1");
  });

  it("includes optional groupId when present", () => {
    const rule = { ...validRule, groupId: "grp-1" };
    const result = parseRules([rule]);
    expect(result[0].groupId).toBe("grp-1");
  });

  it("filters out invalid rules", () => {
    const invalid = [
      null,
      undefined,
      { id: "bad" }, // missing required fields
      { ...validRule, enabled: "yes" }, // wrong type
      { ...validRule, priority: "high" }, // wrong type
    ];
    expect(parseRules(invalid)).toHaveLength(0);
  });

  it("keeps valid rules and skips invalid ones in mixed array", () => {
    const result = parseRules([validRule, null, { id: "bad" }, { ...validRule, id: "r2" }]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});

// ---------------------------------------------------------------------------
// parseRuleGroups
// ---------------------------------------------------------------------------

describe("parseRuleGroups", () => {
  const validGroup = {
    id: "grp-1",
    name: "Core",
    enabled: true,
    priority: 0,
    createdAt: "2026-01-01T00:00:00Z",
  };

  it("returns empty for non-array", () => {
    expect(parseRuleGroups(null)).toHaveLength(0);
  });

  it("parses a valid group", () => {
    const result = parseRuleGroups([validGroup]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Core");
  });

  it("filters invalid groups", () => {
    const invalid = [{ id: "grp-1" }, { ...validGroup, enabled: 1 }];
    expect(parseRuleGroups(invalid)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseCapturedRequests
// ---------------------------------------------------------------------------

describe("parseCapturedRequests", () => {
  const validRequest = {
    id: "req-1",
    method: "GET",
    url: "https://example.com/api",
    headers: {},
    timestamp: "2026-01-01T10:00:00Z",
    captureSource: "network",
    startedAtMs: 1735725600000,
    matchedRules: [],
  };

  it("returns empty for non-array", () => {
    expect(parseCapturedRequests("invalid")).toHaveLength(0);
  });

  it("parses a valid captured request", () => {
    const result = parseCapturedRequests([validRequest]);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com/api");
  });

  it("parses request with optional fields", () => {
    const withOptional = {
      ...validRequest,
      body: '{"key":"val"}',
      resourceType: "xmlhttprequest",
      tabId: 42,
      response: { status: 200, durationMs: 120, timestamp: "2026-01-01T10:00:00Z" },
    };
    const result = parseCapturedRequests([withOptional]);
    expect(result[0].body).toBe('{"key":"val"}');
    expect(result[0].tabId).toBe(42);
  });

  it("filters out requests with invalid captureSource", () => {
    const invalid = { ...validRequest, captureSource: "browser" };
    expect(parseCapturedRequests([invalid])).toHaveLength(0);
  });

  it("accepts mock as captureSource", () => {
    const mock = { ...validRequest, captureSource: "mock" };
    const result = parseCapturedRequests([mock]);
    expect(result[0].captureSource).toBe("mock");
  });

  it("filters requests with invalid matchedRules shape", () => {
    const invalid = { ...validRequest, matchedRules: [{ ruleId: "r1" }] }; // missing ruleName and type
    expect(parseCapturedRequests([invalid])).toHaveLength(0);
  });

  it("accepts matchedRules with all required fields", () => {
    const withRules = {
      ...validRequest,
      matchedRules: [{ ruleId: "r1", ruleName: "Block tracking", type: "block" }],
    };
    const result = parseCapturedRequests([withRules]);
    expect(result[0].matchedRules).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// parseResponseAssertions
// ---------------------------------------------------------------------------

describe("parseResponseAssertions", () => {
  const validAssertion = {
    id: "a1",
    type: "status",
    enabled: true,
    expected: 200,
    createdAt: "2026-01-01T00:00:00Z",
  };

  it("returns empty for non-array", () => {
    expect(parseResponseAssertions(null)).toHaveLength(0);
  });

  it("parses a valid assertion", () => {
    const result = parseResponseAssertions([validAssertion]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("status");
  });

  it("accepts all valid assertion types", () => {
    const types = ["status", "header", "json-path", "body-contains"] as const;

    for (const type of types) {
      const result = parseResponseAssertions([{ ...validAssertion, type }]);
      expect(result).toHaveLength(1);
    }
  });

  it("filters invalid assertion types", () => {
    const invalid = { ...validAssertion, type: "response-code" };
    expect(parseResponseAssertions([invalid])).toHaveLength(0);
  });

  it("accepts optional path, actual, error fields", () => {
    const withOptional = {
      ...validAssertion,
      path: "$.user.id",
      actual: 42,
      error: "Some error",
    };
    const result = parseResponseAssertions([withOptional]);
    expect(result[0].path).toBe("$.user.id");
    expect(result[0].actual).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// parseMockEnvVars
// ---------------------------------------------------------------------------

describe("parseMockEnvVars", () => {
  const validEnvVar = {
    id: "ev1",
    name: "baseUrl",
    value: "https://qa.example.com",
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
  };

  it("returns empty for non-array", () => {
    expect(parseMockEnvVars(undefined)).toHaveLength(0);
  });

  it("parses valid env var", () => {
    const result = parseMockEnvVars([validEnvVar]);
    expect(result[0].name).toBe("baseUrl");
  });

  it("accepts optional scopeUrlContains", () => {
    const withScope = { ...validEnvVar, scopeUrlContains: "/api/orders" };
    const result = parseMockEnvVars([withScope]);
    expect(result[0].scopeUrlContains).toBe("/api/orders");
  });

  it("filters invalid entries", () => {
    const invalid = { ...validEnvVar, enabled: "yes" };
    expect(parseMockEnvVars([invalid])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseRuleValidation
// ---------------------------------------------------------------------------

describe("parseRuleValidation", () => {
  const validValidation = {
    timestamp: "2026-01-01T10:00:00Z",
    passed: true,
    checks: [{ name: "rewrite-enabled", passed: true, details: "1 rule enabled" }],
  };

  it("returns null for non-object input", () => {
    expect(parseRuleValidation(null)).toBeNull();
    expect(parseRuleValidation("string")).toBeNull();
    expect(parseRuleValidation([])).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(parseRuleValidation({ timestamp: "t" })).toBeNull();
    expect(parseRuleValidation({ passed: true, checks: [] })).toBeNull();
  });

  it("parses a valid validation object", () => {
    const result = parseRuleValidation(validValidation);
    expect(result).not.toBeNull();
    expect(result?.passed).toBe(true);
    expect(result?.checks).toHaveLength(1);
  });

  it("filters invalid check entries", () => {
    const withBadChecks = {
      ...validValidation,
      checks: [
        { name: "ok-check", passed: true, details: "looks good" },
        { name: "bad-check" }, // missing passed and details
      ],
    };
    const result = parseRuleValidation(withBadChecks);
    expect(result?.checks).toHaveLength(1);
  });

  it("returns empty checks array when all checks are invalid", () => {
    const withNoValidChecks = {
      ...validValidation,
      checks: [{ name: "x" }, null, "bad"],
    };
    const result = parseRuleValidation(withNoValidChecks);
    expect(result?.checks).toHaveLength(0);
  });
});
