import { describe, it, expect } from "vitest";
import {
  evaluateConditionalMock,
  createMockState,
  resetMockCallCount,
  getMockCallCount,
  type ConditionalMockRule,
  type MockCallContext,
} from "./conditional-mock-evaluator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCtx = (overrides: Partial<MockCallContext> = {}): MockCallContext => ({
  method: "GET",
  url: "https://api.example.com/users",
  headers: {},
  body: undefined,
  ...overrides,
});

const makeRule = (
  branches: ConditionalMockRule["branches"],
  overrides: Partial<ConditionalMockRule> = {}
): ConditionalMockRule => ({
  id: "rule-1",
  name: "Test Mock",
  enabled: true,
  branches,
  ...overrides,
});

const payload = (status = 200, body = "ok"): ConditionalMockRule["branches"][number]["payload"] => ({
  status,
  body,
});

// ---------------------------------------------------------------------------
// always condition
// ---------------------------------------------------------------------------

describe("always condition", () => {
  it("matches unconditionally", () => {
    const rule = makeRule([{ id: "b1", condition: { kind: "always" }, payload: payload(200) }]);
    const result = evaluateConditionalMock(rule, makeCtx(), createMockState());
    expect(result.matched).toBe(true);
  });

  it("does not match when rule is disabled", () => {
    const rule = makeRule(
      [{ id: "b1", condition: { kind: "always" }, payload: payload(200) }],
      { enabled: false }
    );
    const result = evaluateConditionalMock(rule, makeCtx(), createMockState());
    expect(result.matched).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// url-match condition
// ---------------------------------------------------------------------------

describe("url-match condition", () => {
  it("matches when URL contains the string", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "url-match", urlContains: "/users" }, payload: payload(200) },
    ]);
    const result = evaluateConditionalMock(
      rule,
      makeCtx({ url: "https://api.example.com/users/1" }),
      createMockState()
    );
    expect(result.matched).toBe(true);
  });

  it("does not match when URL does not contain the string", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "url-match", urlContains: "/orders" }, payload: payload(200) },
    ]);
    const result = evaluateConditionalMock(
      rule,
      makeCtx({ url: "https://api.example.com/users" }),
      createMockState()
    );
    expect(result.matched).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// method condition
// ---------------------------------------------------------------------------

describe("method condition", () => {
  it("matches correct method (case-insensitive)", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "method", method: "post" }, payload: payload(201) },
    ]);
    const result = evaluateConditionalMock(
      rule,
      makeCtx({ method: "POST" }),
      createMockState()
    );
    expect(result.matched).toBe(true);
  });

  it("does not match wrong method", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "method", method: "DELETE" }, payload: payload(204) },
    ]);
    const result = evaluateConditionalMock(
      rule,
      makeCtx({ method: "GET" }),
      createMockState()
    );
    expect(result.matched).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// header-equals condition
// ---------------------------------------------------------------------------

describe("header-equals condition", () => {
  it("matches when header is present with the expected value", () => {
    const rule = makeRule([
      {
        id: "b1",
        condition: { kind: "header-equals", headerName: "x-test", headerValue: "true" },
        payload: payload(200),
      },
    ]);
    const result = evaluateConditionalMock(
      rule,
      makeCtx({ headers: { "x-test": "true" } }),
      createMockState()
    );
    expect(result.matched).toBe(true);
  });

  it("does not match when header value differs", () => {
    const rule = makeRule([
      {
        id: "b1",
        condition: { kind: "header-equals", headerName: "x-test", headerValue: "true" },
        payload: payload(200),
      },
    ]);
    const result = evaluateConditionalMock(
      rule,
      makeCtx({ headers: { "x-test": "false" } }),
      createMockState()
    );
    expect(result.matched).toBe(false);
  });

  it("does not match when header is absent", () => {
    const rule = makeRule([
      {
        id: "b1",
        condition: { kind: "header-equals", headerName: "authorization", headerValue: "Bearer token" },
        payload: payload(200),
      },
    ]);
    const result = evaluateConditionalMock(rule, makeCtx(), createMockState());
    expect(result.matched).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// body-contains condition
// ---------------------------------------------------------------------------

describe("body-contains condition", () => {
  it("matches when body contains the substring", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "body-contains", substring: "admin" }, payload: payload(200) },
    ]);
    const result = evaluateConditionalMock(
      rule,
      makeCtx({ body: '{"role":"admin"}' }),
      createMockState()
    );
    expect(result.matched).toBe(true);
  });

  it("does not match when body is absent", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "body-contains", substring: "admin" }, payload: payload(200) },
    ]);
    const result = evaluateConditionalMock(rule, makeCtx({ body: undefined }), createMockState());
    expect(result.matched).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sequence condition (state-aware)
// ---------------------------------------------------------------------------

describe("sequence condition", () => {
  it("matches only on the Nth call", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "sequence", nth: 2 }, payload: payload(500, "second call") },
    ]);
    const state = createMockState();

    // First call — count is 1, condition expects 2 → no match
    const r1 = evaluateConditionalMock(rule, makeCtx(), state);
    expect(r1.matched).toBe(false);

    // Second call — count is 2 → match
    const r2 = evaluateConditionalMock(rule, makeCtx(), r1.updatedState);
    expect(r2.matched).toBe(true);
    if (r2.matched) {
      expect(r2.payload.status).toBe(500);
    }
  });

  it("updates state on each call", () => {
    const rule = makeRule([{ id: "b1", condition: { kind: "always" }, payload: payload() }]);
    const s0 = createMockState();
    const r1 = evaluateConditionalMock(rule, makeCtx(), s0);
    expect(getMockCallCount(r1.updatedState, "rule-1")).toBe(1);
    const r2 = evaluateConditionalMock(rule, makeCtx(), r1.updatedState);
    expect(getMockCallCount(r2.updatedState, "rule-1")).toBe(2);
  });

  it("sequence conditions for first-call 500, then 200 fallback", () => {
    const rule = makeRule(
      [
        { id: "b1", condition: { kind: "sequence", nth: 1 }, payload: payload(500, "error") },
      ],
      { fallback: payload(200, "ok") }
    );
    const s0 = createMockState();
    const r1 = evaluateConditionalMock(rule, makeCtx(), s0);
    expect(r1.matched).toBe(true);
    if (r1.matched) expect(r1.payload.status).toBe(500);

    const r2 = evaluateConditionalMock(rule, makeCtx(), r1.updatedState);
    expect(r2.matched).toBe(true);
    if (r2.matched) expect(r2.payload.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// call-count condition
// ---------------------------------------------------------------------------

describe("call-count condition", () => {
  it("matches when call count is within range", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "call-count", min: 1, max: 3 }, payload: payload(200) },
    ]);
    let state = createMockState();
    for (let i = 1; i <= 3; i++) {
      const result = evaluateConditionalMock(rule, makeCtx(), state);
      expect(result.matched).toBe(true);
      state = result.updatedState;
    }
    // 4th call exceeds max
    const result = evaluateConditionalMock(rule, makeCtx(), state);
    expect(result.matched).toBe(false);
  });

  it("matches open-ended range (no max)", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "call-count", min: 2 }, payload: payload(200) },
    ]);
    const s0 = createMockState();
    const r1 = evaluateConditionalMock(rule, makeCtx(), s0); // count = 1, min = 2 → no match
    expect(r1.matched).toBe(false);

    const r2 = evaluateConditionalMock(rule, makeCtx(), r1.updatedState); // count = 2 → match
    expect(r2.matched).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

describe("fallback", () => {
  it("uses fallback when no branch matches", () => {
    const rule = makeRule(
      [{ id: "b1", condition: { kind: "url-match", urlContains: "/admin" }, payload: payload(403) }],
      { fallback: payload(200, "fallback") }
    );
    const result = evaluateConditionalMock(rule, makeCtx({ url: "/public" }), createMockState());
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.payload.status).toBe(200);
      expect(result.payload.body).toBe("fallback");
    }
  });

  it("does not match if no branch and no fallback", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "url-match", urlContains: "/admin" }, payload: payload(403) },
    ]);
    const result = evaluateConditionalMock(rule, makeCtx({ url: "/public" }), createMockState());
    expect(result.matched).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// First-branch-wins
// ---------------------------------------------------------------------------

describe("first-branch-wins", () => {
  it("returns the first matching branch, not later ones", () => {
    const rule = makeRule([
      { id: "b1", condition: { kind: "always" }, payload: payload(200, "first") },
      { id: "b2", condition: { kind: "always" }, payload: payload(500, "second") },
    ]);
    const result = evaluateConditionalMock(rule, makeCtx(), createMockState());
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.payload.status).toBe(200);
      expect(result.payload.body).toBe("first");
    }
  });
});

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

describe("createMockState / resetMockCallCount / getMockCallCount", () => {
  it("createMockState returns empty call counts", () => {
    const state = createMockState();
    expect(state.callCounts).toEqual({});
  });

  it("getMockCallCount returns 0 for unknown rule", () => {
    expect(getMockCallCount(createMockState(), "unknown")).toBe(0);
  });

  it("resetMockCallCount sets counter to 0", () => {
    const state: ReturnType<typeof createMockState> = { callCounts: { "rule-1": 5 } };
    const reset = resetMockCallCount(state, "rule-1");
    expect(reset.callCounts["rule-1"]).toBe(0);
  });

  it("resetMockCallCount does not mutate original state", () => {
    const state = { callCounts: { "rule-1": 5 } };
    resetMockCallCount(state, "rule-1");
    expect(state.callCounts["rule-1"]).toBe(5);
  });
});
