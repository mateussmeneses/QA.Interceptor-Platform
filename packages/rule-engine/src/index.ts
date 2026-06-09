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

export const evaluateRules = (
  rules: Rule[],
  request: InterceptedRequest
): RuleEvaluationResult => {
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

const matchesCondition = (rule: Rule, request: InterceptedRequest): boolean => {
  const condition = rule.condition;

  if (condition.method && condition.method !== request.method) {
    return false;
  }

  if (condition.urlContains && !request.url.includes(condition.urlContains)) {
    return false;
  }

  return true;
};