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

export type RuleCoverage = {
  /** True when the condition has no URL constraint, so it matches every URL. */
  matchesAllUrls: boolean;
  /** True when the condition is restricted to a specific HTTP method. */
  methodScoped: boolean;
};

/**
 * Single source of truth for a rule's match coverage (QAI-001 / ADR-008).
 *
 * A condition without `urlContains` matches any URL — this is a domain fact, so
 * both the DNR adapter (background) and the UI consume it from here instead of
 * re-deriving it from regex/string literals. Adapters MUST mirror this: a rule
 * the engine considers matchable must never be silently dropped.
 */
export const describeRuleCoverage = (rule: Rule): RuleCoverage => {
  const condition = rule.condition;
  const hasUrl = typeof condition.urlContains === "string" && condition.urlContains.length > 0;
  const hasMethod = typeof condition.method === "string" && condition.method.length > 0;

  return {
    matchesAllUrls: !hasUrl,
    methodScoped: hasMethod
  };
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

export {
  detectRegressions,
  type TrafficSnapshotEntry,
  type RegressionFinding,
  type RegressionReport,
  type RegressionKind,
  type RegressionSeverity
} from "./regression-detector.js";

export {
  detectBottlenecks,
  type BottleneckEntry,
  type BottleneckFinding,
  type BottleneckReport,
  type BottleneckStats,
  type BottleneckReason,
  type BottleneckOptions
} from "./bottleneck-detector.js";

export {
  profileBandwidth,
  type BandwidthEntry,
  type BandwidthEndpointProfile,
  type BandwidthReport
} from "./bandwidth-profiler.js";

export {
  detectAnomalies,
  type AnomalyEntry,
  type AnomalyFinding,
  type AnomalyReport,
  type AnomalyKind,
  type AnomalySeverity,
  type AnomalyOptions
} from "./anomaly-detector.js";
