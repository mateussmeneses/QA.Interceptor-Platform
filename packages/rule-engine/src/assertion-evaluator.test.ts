import { describe, it, expect } from "vitest";
import {
  evaluateAssertions,
  type AssertionInput,
  type ResponseContext
} from "./assertion-evaluator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeAssertion = (overrides: Partial<AssertionInput> = {}): AssertionInput => ({
  id: "a1",
  type: "status",
  enabled: true,
  expected: 200,
  ...overrides
});

const makeResponse = (overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  status: 200,
  headers: { "content-type": "application/json" },
  body: '{"user":{"id":42,"name":"Alice"},"items":[1,2,3]}',
  ...overrides
});

// ---------------------------------------------------------------------------
// evaluateAssertions — disabled assertions
// ---------------------------------------------------------------------------

describe("evaluateAssertions — disabled filtering", () => {
  it("skips disabled assertions", () => {
    const assertion = makeAssertion({ enabled: false });
    const results = evaluateAssertions([assertion], makeResponse());
    expect(results).toHaveLength(0);
  });

  it("includes enabled assertions only", () => {
    const assertions = [
      makeAssertion({ id: "a1", enabled: true }),
      makeAssertion({ id: "a2", enabled: false })
    ];
    const results = evaluateAssertions(assertions, makeResponse());
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("a1");
  });
});

// ---------------------------------------------------------------------------
// Status assertions
// ---------------------------------------------------------------------------

describe("evaluateAssertions — status", () => {
  it("passes when status matches expected", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "status", expected: 200 })],
      makeResponse({ status: 200 })
    );
    expect(result[0].passed).toBe(true);
    expect(result[0].actual).toBe(200);
  });

  it("fails when status does not match", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "status", expected: 200 })],
      makeResponse({ status: 404 })
    );
    expect(result[0].passed).toBe(false);
    expect(result[0].actual).toBe(404);
  });

  it("fails when expected is not a valid number", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "status", expected: "abc" })],
      makeResponse({ status: 200 })
    );
    expect(result[0].passed).toBe(false);
  });

  it("passes with string expected that coerces to number", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "status", expected: "200" })],
      makeResponse({ status: 200 })
    );
    expect(result[0].passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Header assertions
// ---------------------------------------------------------------------------

describe("evaluateAssertions — header", () => {
  it("passes when header value contains expected string", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "header", path: "content-type", expected: "application/json" })],
      makeResponse({ headers: { "content-type": "application/json; charset=utf-8" } })
    );
    expect(result[0].passed).toBe(true);
  });

  it("fails when header value does not contain expected string", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "header", path: "content-type", expected: "text/html" })],
      makeResponse({ headers: { "content-type": "application/json" } })
    );
    expect(result[0].passed).toBe(false);
  });

  it("fails when header is absent", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "header", path: "x-custom", expected: "value" })],
      makeResponse({ headers: {} })
    );
    expect(result[0].passed).toBe(false);
  });

  it("returns error when path is not provided", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "header", expected: "value" })],
      makeResponse()
    );
    expect(result[0].passed).toBe(false);
    expect(result[0].error).toBeTruthy();
  });

  it("matches header names case-insensitively", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "header", path: "Content-Type", expected: "application/json" })],
      makeResponse({ headers: { "content-type": "application/json" } })
    );
    expect(result[0].passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// JSON path assertions
// ---------------------------------------------------------------------------

describe("evaluateAssertions — json-path", () => {
  it("resolves a simple dot path and passes on match", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "json-path", path: "$.user.id", expected: "42" })],
      makeResponse()
    );
    expect(result[0].passed).toBe(true);
    expect(result[0].actual).toBe(42);
  });

  it("resolves a path without leading $.", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "json-path", path: "user.name", expected: "Alice" })],
      makeResponse()
    );
    expect(result[0].passed).toBe(true);
    expect(result[0].actual).toBe("Alice");
  });

  it("resolves an array index", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "json-path", path: "$.items[1]", expected: "2" })],
      makeResponse()
    );
    expect(result[0].passed).toBe(true);
    expect(result[0].actual).toBe(2);
  });

  it("fails when path does not exist", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "json-path", path: "$.missing.key", expected: "x" })],
      makeResponse()
    );
    expect(result[0].passed).toBe(false);
  });

  it("returns error when body is empty", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "json-path", path: "$.user.id", expected: "42" })],
      makeResponse({ body: undefined })
    );
    expect(result[0].passed).toBe(false);
    expect(result[0].error).toBeTruthy();
  });

  it("returns error when body is not valid JSON", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "json-path", path: "$.user.id", expected: "42" })],
      makeResponse({ body: "<html>error</html>" })
    );
    expect(result[0].passed).toBe(false);
    expect(result[0].error).toBeTruthy();
  });

  it("returns error when path is not provided", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "json-path", expected: "42" })],
      makeResponse()
    );
    expect(result[0].passed).toBe(false);
    expect(result[0].error).toBeTruthy();
  });

  it("fails when value exists but does not match expected", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "json-path", path: "$.user.name", expected: "Bob" })],
      makeResponse()
    );
    expect(result[0].passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Body-contains assertions
// ---------------------------------------------------------------------------

describe("evaluateAssertions — body-contains", () => {
  it("passes when body contains expected string", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "body-contains", expected: "Alice" })],
      makeResponse()
    );
    expect(result[0].passed).toBe(true);
  });

  it("fails when body does not contain expected string", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "body-contains", expected: "Bob" })],
      makeResponse()
    );
    expect(result[0].passed).toBe(false);
  });

  it("passes when body is empty string and expected is empty string", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "body-contains", expected: "" })],
      makeResponse({ body: "" })
    );
    expect(result[0].passed).toBe(true);
  });

  it("treats undefined body as empty string", () => {
    const result = evaluateAssertions(
      [makeAssertion({ type: "body-contains", expected: "text" })],
      makeResponse({ body: undefined })
    );
    expect(result[0].passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Multiple assertions in one call
// ---------------------------------------------------------------------------

describe("evaluateAssertions — multiple", () => {
  it("evaluates all enabled assertions independently", () => {
    const assertions: AssertionInput[] = [
      makeAssertion({ id: "a1", type: "status", expected: 200 }),
      makeAssertion({ id: "a2", type: "body-contains", expected: "Alice" }),
      makeAssertion({ id: "a3", type: "status", expected: 404 })
    ];
    const results = evaluateAssertions(assertions, makeResponse());

    expect(results).toHaveLength(3);
    expect(results.find((r) => r.id === "a1")?.passed).toBe(true);
    expect(results.find((r) => r.id === "a2")?.passed).toBe(true);
    expect(results.find((r) => r.id === "a3")?.passed).toBe(false);
  });
});
