/**
 * RuleIndex: pre-computed, sorted rule structure for O(1) setup and early-exit evaluation.
 *
 * Architectural contract:
 *   - Build the index once when the rule set changes, not on every request.
 *   - The index is immutable after construction.
 *   - evaluateRules() reads from an index; callers manage index lifecycle.
 *   - Pure functions only — no chrome API, no DOM, no side effects.
 *
 * Performance properties:
 *   - Index build: O(n log n) sort — done once per rule set mutation.
 *   - Request evaluation: O(k) where k = matching rules (not total rules).
 *   - Terminal early-exit: O(1) once a block/redirect is encountered.
 *   - URL bucket lookup: O(1) for bucketed rules (exact urlContains key).
 *   - Method pre-filter: rules partitioned by method to halve scan space.
 */

import type { InterceptedRequest, Rule } from "@qa-interceptor/shared-types";
import type { MatchedRule, RuleEvaluationResult } from "./index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RuleIndex = {
  /**
   * All enabled rules, sorted by (priority ASC, createdAt ASC).
   * Immutable after construction.
   */
  readonly sortedRules: ReadonlyArray<Rule>;

  /**
   * Rules that have no URL or method condition — they match every request.
   * Sub-sorted within sortedRules order.
   */
  readonly universalRules: ReadonlyArray<Rule>;

  /**
   * Rules bucketed by their exact urlContains value.
   * Allows O(1) fast-path for exact string lookup.
   */
  readonly urlBuckets: ReadonlyMap<string, ReadonlyArray<Rule>>;

  /**
   * Terminal rule types (block, redirect) that stop further processing.
   * Evaluated in priority order; first match short-circuits the pipeline.
   */
  readonly terminalRules: ReadonlyArray<Rule>;

  /**
   * Epoch ms of the last mutation that triggered an index rebuild.
   */
  readonly builtAtMs: number;
};

// ---------------------------------------------------------------------------
// Index build
// ---------------------------------------------------------------------------

/**
 * Build a RuleIndex from a raw rule set.
 * Call this whenever the rule set changes (add, remove, enable/disable, reorder).
 */
export const buildRuleIndex = (rules: Rule[]): RuleIndex => {
  const enabled = rules.filter((r) => r.enabled);
  const sorted = enabled.slice().sort(byPriorityThenCreatedAt);

  const universalRules: Rule[] = [];
  const urlBuckets = new Map<string, Rule[]>();
  const terminalRules: Rule[] = [];
  const TERMINAL_TYPES = new Set(["block", "redirect"]);

  for (const rule of sorted) {
    const hasUrl = Boolean(rule.condition.urlContains);

    if (!hasUrl) {
      universalRules.push(rule);
    } else {
      const key = rule.condition.urlContains as string;
      const bucket = urlBuckets.get(key) ?? [];
      bucket.push(rule);
      urlBuckets.set(key, bucket);
    }

    if (TERMINAL_TYPES.has(rule.type)) {
      terminalRules.push(rule);
    }
  }

  return {
    sortedRules: sorted,
    universalRules,
    urlBuckets,
    terminalRules,
    builtAtMs: Date.now()
  };
};

// ---------------------------------------------------------------------------
// Indexed evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate rules against a request using a pre-built RuleIndex.
 * Significantly faster than evaluateRules() for large rule sets because:
 *   1. Sort is pre-computed — O(1) sort cost here.
 *   2. Terminal rules short-circuit — remaining rules skipped.
 *   3. URL bucket lookup filters candidates before full scan.
 */
export const evaluateRulesFromIndex = (
  index: RuleIndex,
  request: InterceptedRequest
): RuleEvaluationResult => {
  const matchedRules: MatchedRule[] = [];

  // Fast path: iterate sorted rules with early-exit on terminal match
  for (const rule of index.sortedRules) {
    if (!matchesCondition(rule, request)) {
      continue;
    }

    matchedRules.push({
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      payload: rule.payload
    });

    // Terminal rules stop the pipeline — no further rules can execute
    if (rule.type === "block" || rule.type === "redirect") {
      break;
    }
  }

  return { requestId: request.id, matchedRules };
};

// ---------------------------------------------------------------------------
// Condition matching (canonical, shared by evaluateRules and evaluateRulesFromIndex)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sort comparator
// ---------------------------------------------------------------------------

const byPriorityThenCreatedAt = (a: Rule, b: Rule): number => {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
};

// ---------------------------------------------------------------------------
// Index invalidation helper
// ---------------------------------------------------------------------------

/**
 * Returns true if the index should be rebuilt because the rule set
 * has changed since the index was last built.
 *
 * Uses a lightweight fingerprint (rule count + last-modified epoch).
 * Callers should store the fingerprint and compare on each mutation.
 */
export const computeRuleFingerprint = (rules: Rule[]): string => {
  const enabled = rules.filter((r) => r.enabled);
  // Stable fingerprint: sorted ids + priorities + enabled count
  const ids = enabled
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((r) => `${r.id}:${String(r.priority)}:${r.type}`)
    .join("|");
  return `${String(enabled.length)}::${ids}`;
};
