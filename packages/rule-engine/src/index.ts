import type { InterceptedRequest, Rule } from "@qa-interceptor/shared-types";

export type MatchedRule = {
  ruleId: string;
  ruleName: Rule["name"];
  type: Rule["type"];
  payload: Rule["payload"];
};

export type RuleEvaluationResult = {
  requestId: string;
  matchedRules: MatchedRule[];
};

export const evaluateRules = (rules: Rule[], request: InterceptedRequest): RuleEvaluationResult => {
  const matchedRules = rules
    .filter((rule) => rule.enabled)
    .sort(byPriorityThenCreatedAt)
    .filter((rule) => matchesCondition(rule, request))
    .map((rule) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      payload: rule.payload
    }));

  return {
    requestId: request.id,
    matchedRules
  };
};

const byPriorityThenCreatedAt = (a: Rule, b: Rule): number => {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
};

/**
 * Canonical rule-condition matcher.
 * Method comparison is case-insensitive so behavior is consistent across the
 * background DNR pipeline and the page fetch bridge.
 */
export const matchesCondition = (rule: Rule, request: InterceptedRequest): boolean => {
  const condition = rule.condition;

  if (condition.method && condition.method.toUpperCase() !== request.method.toUpperCase()) {
    return false;
  }

  if (condition.urlContains && !request.url.includes(condition.urlContains)) {
    return false;
  }

  return true;
};

export {
  evaluateAssertions,
  type AssertionInput,
  type AssertionResult,
  type ResponseContext,
  type AssertionType
} from "./assertion-evaluator.js";

export {
  validateJsonSchema,
  validateJsonString,
  type JsonSchema,
  type JsonSchemaValidationError,
  type JsonSchemaValidationResult
} from "./schema-validator.js";

export {
  compareContracts,
  compareContractStrings,
  type SnapshotDiffEntry,
  type SnapshotComparisonResult
} from "./contract-comparator.js";

export {
  detectConflicts,
  groupConflictsByRule,
  sortConflictsBySeverity,
  type RuleConflict,
  type ConflictReport,
  type ConflictKind,
  type ConflictSeverity
} from "./conflict-detector.js";

export {
  diffText,
  normalizeDiffText,
  type DiffResult,
  type DiffLine,
  type DiffLineStatus
} from "./diff-engine.js";

export {
  evaluateConditionalMock,
  createMockState,
  resetMockCallCount,
  getMockCallCount,
  type ConditionalMockRule,
  type ConditionalMockBranch,
  type MockCondition,
  type MockConditionKind,
  type MockCallContext,
  type MockState,
  type MockEvalResult
} from "./conditional-mock-evaluator.js";

export {
  inferSchema,
  inferSchemaFromString,
  inferSchemaFromSamples,
  mergeSchemas,
  type InferenceOptions
} from "./schema-inference.js";

export {
  isContentRule,
  isContentMockEnvVar,
  isContentConditionalMock,
  type ContentRule,
  type ContentRuleCondition,
  type ContentMockEnvVar,
  type ContentConditionalMock,
  type ContentConditionalMockBranch
} from "./content-guards.js";
