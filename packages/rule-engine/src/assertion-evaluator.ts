/**
 * Assertion evaluator.
 * Evaluates a set of response assertions against a captured response and returns results.
 * This is a pure function module — no chrome API, no DOM, fully testable.
 */

export type AssertionType = "status" | "header" | "json-path" | "body-contains";

export type AssertionInput = {
  id: string;
  type: AssertionType;
  enabled: boolean;
  expected: unknown;
  path?: string;
};

export type AssertionResult = AssertionInput & {
  passed: boolean;
  actual?: unknown;
  error?: string;
};

export type ResponseContext = {
  status: number;
  headers: Record<string, string>;
  body?: string;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export const evaluateAssertions = (
  assertions: AssertionInput[],
  response: ResponseContext
): AssertionResult[] =>
  assertions
    .filter((assertion) => assertion.enabled)
    .map((assertion) => evaluateSingle(assertion, response));

// ---------------------------------------------------------------------------
// Single assertion dispatch
// ---------------------------------------------------------------------------

const evaluateSingle = (assertion: AssertionInput, response: ResponseContext): AssertionResult => {
  try {
    switch (assertion.type) {
      case "status":
        return evaluateStatus(assertion, response);
      case "header":
        return evaluateHeader(assertion, response);
      case "json-path":
        return evaluateJsonPath(assertion, response);
      case "body-contains":
        return evaluateBodyContains(assertion, response);
      default:
        return {
          ...assertion,
          passed: false,
          error: `Unknown assertion type: ${String(assertion.type)}`,
        };
    }
  } catch (err) {
    return {
      ...assertion,
      passed: false,
      error: err instanceof Error ? err.message : "Evaluation error",
    };
  }
};

// ---------------------------------------------------------------------------
// Type-specific evaluators
// ---------------------------------------------------------------------------

const evaluateStatus = (
  assertion: AssertionInput,
  response: ResponseContext
): AssertionResult => {
  const actual = response.status;
  const expected = Number(assertion.expected);
  const passed = Number.isFinite(expected) && actual === expected;

  return { ...assertion, passed, actual };
};

const evaluateHeader = (
  assertion: AssertionInput,
  response: ResponseContext
): AssertionResult => {
  if (!assertion.path) {
    return {
      ...assertion,
      passed: false,
      error: "Header assertion requires 'path' (header name).",
    };
  }

  const headerName = assertion.path.toLowerCase();
  const actual = response.headers[headerName] ?? response.headers[assertion.path];
  const expected = String(assertion.expected);
  const passed = actual !== undefined && actual.includes(expected);

  return { ...assertion, passed, actual };
};

const evaluateJsonPath = (
  assertion: AssertionInput,
  response: ResponseContext
): AssertionResult => {
  if (!assertion.path) {
    return {
      ...assertion,
      passed: false,
      error: "JSON path assertion requires 'path' (e.g. $.user.id).",
    };
  }

  if (!response.body) {
    return {
      ...assertion,
      passed: false,
      error: "Response body is empty — cannot evaluate JSON path.",
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(response.body);
  } catch {
    return {
      ...assertion,
      passed: false,
      error: "Response body is not valid JSON.",
    };
  }

  const actual = resolveJsonPath(parsed, assertion.path);
  const passed = actual !== undefined && String(actual) === String(assertion.expected);

  return { ...assertion, passed, actual };
};

const evaluateBodyContains = (
  assertion: AssertionInput,
  response: ResponseContext
): AssertionResult => {
  const body = response.body ?? "";
  const needle = String(assertion.expected);
  const passed = body.includes(needle);

  return { ...assertion, passed, actual: passed ? needle : undefined };
};

// ---------------------------------------------------------------------------
// Minimal dot-path resolver for JSON values (supports $.a.b.c and a.b.c)
// No external dependency — handles simple flat/nested paths only
// ---------------------------------------------------------------------------

const resolveJsonPath = (root: unknown, path: string): unknown => {
  // Strip leading $. or $[
  const normalised = path.replace(/^\$\.?/, "").replace(/\[(\d+)\]/g, ".$1");
  const segments = normalised.split(".").filter(Boolean);

  let current: unknown = root;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== "object") {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);

      if (!Number.isInteger(index)) {
        return undefined;
      }

      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[segment];
    }
  }

  return current;
};
