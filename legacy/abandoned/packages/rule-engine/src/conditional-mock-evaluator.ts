/**
 * Conditional mock evaluator.
 *
 * Architectural contract:
 *   - Pure functions only. No side effects, no DOM, no chrome API.
 *   - The state machine (sequence counters, call history) is passed in
 *     and returned as a new object — callers own state lifecycle.
 *   - Designed to be consumed by the mock-bridge (content script) and
 *     the Phase 4 proxy's rule-bridge without code duplication.
 *
 * Mock condition kinds:
 *   ALWAYS     — unconditional (default, backward-compatible with existing mocks)
 *   URL_MATCH  — when request URL contains a substring
 *   METHOD     — when request method equals a value
 *   HEADER     — when a request header equals a value
 *   BODY_CONTAINS — when request body contains a substring
 *   SEQUENCE   — first N calls → response A, then response B (state-aware)
 *   CALL_COUNT — when call count is within a numeric range
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MockConditionKind =
  | "always"
  | "url-match"
  | "method"
  | "header-equals"
  | "body-contains"
  | "sequence"
  | "call-count";

export type MockCondition =
  | { kind: "always" }
  | { kind: "url-match"; urlContains: string }
  | { kind: "method"; method: string }
  | { kind: "header-equals"; headerName: string; headerValue: string }
  | { kind: "body-contains"; substring: string }
  | { kind: "sequence"; nth: number }
  | { kind: "call-count"; min: number; max?: number };

export type ConditionalMockBranch = {
  id: string;
  condition: MockCondition;
  /**
   * The mock payload to return when this branch's condition is true.
   * Shape mirrors the existing mock-response rule payload.
   */
  payload: {
    status?: number;
    headers?: Record<string, string>;
    body?: string;
    delayMs?: number;
  };
};

export type ConditionalMockRule = {
  id: string;
  name: string;
  enabled: boolean;
  /** Evaluated in order; first matching branch wins. */
  branches: ConditionalMockBranch[];
  /**
   * Optional fallback branch if no condition matches.
   * If absent and nothing matches, the request is not mocked.
   */
  fallback?: ConditionalMockBranch["payload"];
};

export type MockCallContext = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
};

/**
 * Mutable state owned by the caller (chrome.storage / proxy memory).
 * Tracks how many times each conditional mock has been called.
 */
export type MockState = {
  /** Map from ConditionalMockRule.id → call count */
  callCounts: Record<string, number>;
};

export type MockEvalResult =
  | { matched: true; payload: ConditionalMockBranch["payload"]; updatedState: MockState }
  | { matched: false; updatedState: MockState };

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Evaluate a conditional mock rule against a request context.
 * Returns the matched payload and the updated state (call count incremented).
 */
export const evaluateConditionalMock = (
  rule: ConditionalMockRule,
  context: MockCallContext,
  state: MockState
): MockEvalResult => {
  if (!rule.enabled) {
    return { matched: false, updatedState: state };
  }

  // Increment call count for this rule before evaluation (1-indexed for sequence)
  const currentCount = (state.callCounts[rule.id] ?? 0) + 1;
  const updatedState: MockState = {
    callCounts: { ...state.callCounts, [rule.id]: currentCount }
  };

  for (const branch of rule.branches) {
    if (evaluateCondition(branch.condition, context, currentCount)) {
      return { matched: true, payload: branch.payload, updatedState };
    }
  }

  if (rule.fallback !== undefined) {
    return { matched: true, payload: rule.fallback, updatedState };
  }

  return { matched: false, updatedState };
};

// ---------------------------------------------------------------------------
// Condition evaluator
// ---------------------------------------------------------------------------

const evaluateCondition = (
  condition: MockCondition,
  context: MockCallContext,
  callCount: number
): boolean => {
  switch (condition.kind) {
    case "always":
      return true;

    case "url-match":
      return context.url.includes(condition.urlContains);

    case "method":
      return context.method.toUpperCase() === condition.method.toUpperCase();

    case "header-equals": {
      const header = context.headers[condition.headerName.toLowerCase()];
      return header === condition.headerValue;
    }

    case "body-contains":
      return typeof context.body === "string" && context.body.includes(condition.substring);

    case "sequence":
      return callCount === condition.nth;

    case "call-count": {
      const min = condition.min;
      const max = condition.max ?? Infinity;
      return callCount >= min && callCount <= max;
    }

    default:
      return false;
  }
};

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

/** Create a fresh mock state (all counters at zero). */
export const createMockState = (): MockState => ({ callCounts: {} });

/** Reset the call counter for a specific rule. */
export const resetMockCallCount = (state: MockState, ruleId: string): MockState => ({
  callCounts: { ...state.callCounts, [ruleId]: 0 }
});

/** Get the current call count for a rule (0 if never called). */
export const getMockCallCount = (state: MockState, ruleId: string): number =>
  state.callCounts[ruleId] ?? 0;
