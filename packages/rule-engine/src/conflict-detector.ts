/**
 * Rule conflict detector.
 *
 * Architectural contract:
 *   - Pure functions only. No DOM, no chrome API, no side effects.
 *   - Consumed by the UI layer (sidepanel settings) and future desktop app.
 *   - Two rules conflict when both can match the same request AND they operate
 *     on the same resource dimension with last-write-wins semantics.
 *
 * Conflict taxonomy:
 *   OVERLAP   — both rules match the same URL pattern / condition scope.
 *   DIMENSION — both rules write the same field (url, header name, response body…).
 *   SHADOW    — a higher-priority rule renders a lower-priority rule unreachable.
 *   ORDER     — rules produce different results depending on execution order.
 */

import type { Rule } from "@qa-interceptor/shared-types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ConflictSeverity = "error" | "warning" | "info";

export type ConflictKind =
  | "same-dimension-overlap" // two rules write the same field for the same URL scope
  | "url-shadow" // one rule's URL pattern is a strict subset of another's
  | "priority-tie" // two rules have identical priority and overlapping conditions
  | "terminal-unreachable"; // a block/redirect makes subsequent rules unreachable

export type RuleConflict = {
  kind: ConflictKind;
  severity: ConflictSeverity;
  ruleIds: [string, string];
  ruleNames: [string, string];
  description: string;
  suggestion: string;
};

export type ConflictReport = {
  conflicts: RuleConflict[];
  hasErrors: boolean;
  hasWarnings: boolean;
  affectedRuleIds: Set<string>;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Analyse a rule set and return all detected conflicts.
 * Only enabled rules participate in conflict analysis.
 */
export const detectConflicts = (rules: Rule[]): ConflictReport => {
  const enabled = rules.filter((r) => r.enabled);
  const conflicts: RuleConflict[] = [];

  for (let i = 0; i < enabled.length; i++) {
    for (let j = i + 1; j < enabled.length; j++) {
      const a = enabled[i];
      const b = enabled[j];

      if (!a || !b) {
        continue;
      }

      if (!conditionsOverlap(a, b)) {
        continue;
      }

      // Check each conflict category
      const dimensionConflict = checkDimensionConflict(a, b);

      if (dimensionConflict) {
        conflicts.push(dimensionConflict);
      }

      const shadowConflict = checkShadowConflict(a, b);

      if (shadowConflict) {
        conflicts.push(shadowConflict);
      }

      const priorityTie = checkPriorityTie(a, b);

      if (priorityTie) {
        conflicts.push(priorityTie);
      }

      const terminalConflict = checkTerminalConflict(a, b);

      if (terminalConflict) {
        conflicts.push(terminalConflict);
      }
    }
  }

  const affectedRuleIds = new Set(conflicts.flatMap((c) => c.ruleIds));

  return {
    conflicts,
    hasErrors: conflicts.some((c) => c.severity === "error"),
    hasWarnings: conflicts.some((c) => c.severity === "warning"),
    affectedRuleIds
  };
};

// ---------------------------------------------------------------------------
// Condition overlap check
// ---------------------------------------------------------------------------

/**
 * Returns true if two rules could potentially match the same request.
 * Conditions overlap when:
 *  - both have the same method restriction, or one/both have no restriction
 *  - both share a URL substring, or one/both have no URL restriction
 */
const conditionsOverlap = (a: Rule, b: Rule): boolean => {
  const methodA = a.condition.method;
  const methodB = b.condition.method;

  if (methodA && methodB && methodA !== methodB) {
    return false;
  }

  const urlA = a.condition.urlContains;
  const urlB = b.condition.urlContains;

  if (urlA && urlB) {
    // They overlap if one contains the other, or both contain the same sub-string
    return urlA.includes(urlB) || urlB.includes(urlA) || urlA === urlB;
  }

  return true;
};

// ---------------------------------------------------------------------------
// Conflict detectors
// ---------------------------------------------------------------------------

/**
 * Two rules conflict on dimension when they write to the same resource field.
 * Examples: two rewrite-url rules, two mock-response rules, two mock-status rules.
 */
const checkDimensionConflict = (a: Rule, b: Rule): RuleConflict | null => {
  const dimensionMap: Record<string, string> = {
    "rewrite-url": "request URL",
    "rewrite-response": "response body",
    "rewrite-request-body": "request body",
    "mock-response": "response body",
    "mock-status": "response status code",
    redirect: "request destination",
    block: "request lifecycle",
    delay: "request timing"
  };

  if (a.type !== b.type) {
    // Cross-type dimension conflicts: mock-response vs rewrite-response both write response body
    const responseBodyTypes = new Set(["mock-response", "rewrite-response"]);

    if (responseBodyTypes.has(a.type) && responseBodyTypes.has(b.type)) {
      return {
        kind: "same-dimension-overlap",
        severity: "warning",
        ruleIds: [a.id, b.id],
        ruleNames: [a.name, b.name],
        description: `"${a.name}" (${a.type}) and "${b.name}" (${b.type}) both modify the response body for overlapping URLs. The higher-priority rule's effect will overwrite the other.`,
        suggestion: `Ensure the rules have non-overlapping URL conditions, or consolidate them into a single rule with combined logic.`
      };
    }

    return null;
  }

  const dimension = dimensionMap[a.type];

  if (!dimension) {
    return null;
  }

  return {
    kind: "same-dimension-overlap",
    severity: "warning",
    ruleIds: [a.id, b.id],
    ruleNames: [a.name, b.name],
    description: `"${a.name}" and "${b.name}" are both of type "${a.type}" and can match the same requests. They write to the same dimension (${dimension}). The last applied rule will take effect.`,
    suggestion: `Separate their URL conditions so they apply to distinct request sets, or merge them into one rule.`
  };
};

/**
 * Shadow conflict: a broader rule (no URL filter) hides a narrower rule
 * when the broader rule is of a terminal type (block, redirect).
 */
const checkShadowConflict = (a: Rule, b: Rule): RuleConflict | null => {
  const terminalTypes = new Set(["block", "redirect"]);

  for (const [terminal, shadowed] of [
    [a, b],
    [b, a]
  ] as const) {
    if (!terminalTypes.has(terminal.type)) {
      continue;
    }

    const terminalHasUrl = Boolean(terminal.condition.urlContains);
    const shadowedHasUrl = Boolean(shadowed.condition.urlContains);

    if (!terminalHasUrl && shadowedHasUrl) {
      // terminal has no URL restriction — it matches everything, potentially shadowing the other
      return {
        kind: "url-shadow",
        severity: "warning",
        ruleIds: [terminal.id, shadowed.id],
        ruleNames: [terminal.name, shadowed.name],
        description: `"${terminal.name}" (${terminal.type}, no URL filter) applies to all requests and may shadow "${shadowed.name}" depending on execution order.`,
        suggestion: `Add a URL condition to "${terminal.name}" to limit its scope, or adjust priorities so "${shadowed.name}" runs first when needed.`
      };
    }
  }

  return null;
};

/**
 * Priority tie: two rules with the exact same priority and overlapping conditions.
 * Execution order becomes non-deterministic beyond alphabetical/creation-time tie-breaking.
 */
const checkPriorityTie = (a: Rule, b: Rule): RuleConflict | null => {
  if (a.priority !== b.priority) {
    return null;
  }

  return {
    kind: "priority-tie",
    severity: "info",
    ruleIds: [a.id, b.id],
    ruleNames: [a.name, b.name],
    description: `"${a.name}" and "${b.name}" share priority ${String(a.priority)} with overlapping conditions. Execution order is resolved by creation time (oldest first), which may be unintentional.`,
    suggestion: `Assign distinct priorities to make execution order explicit and predictable.`
  };
};

/**
 * Terminal unreachable: a block or redirect rule with lower priority than another
 * conflicting rule makes that other rule unreachable in practice.
 */
const checkTerminalConflict = (a: Rule, b: Rule): RuleConflict | null => {
  const terminalTypes = new Set(["block", "redirect"]);

  for (const [terminal, other] of [
    [a, b],
    [b, a]
  ] as const) {
    if (!terminalTypes.has(terminal.type)) {
      continue;
    }

    if (terminal.priority < other.priority) {
      // terminal runs first (lower priority number = higher precedence)
      return {
        kind: "terminal-unreachable",
        severity: "error",
        ruleIds: [terminal.id, other.id],
        ruleNames: [terminal.name, other.name],
        description: `"${terminal.name}" (${terminal.type}, priority ${String(terminal.priority)}) runs before "${other.name}" (priority ${String(other.priority)}) and terminates the request lifecycle. "${other.name}" will never execute for matching requests.`,
        suggestion: `Increase the priority of "${other.name}" above ${String(terminal.priority)}, or add a narrower URL condition to "${terminal.name}" so it does not apply to the full scope.`
      };
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Grouped summary helpers
// ---------------------------------------------------------------------------

/**
 * Group conflicts by the rules they affect, for use in settings UI.
 */
export const groupConflictsByRule = (report: ConflictReport): Map<string, RuleConflict[]> => {
  const grouped = new Map<string, RuleConflict[]>();

  for (const conflict of report.conflicts) {
    for (const ruleId of conflict.ruleIds) {
      const existing = grouped.get(ruleId) ?? [];
      existing.push(conflict);
      grouped.set(ruleId, existing);
    }
  }

  return grouped;
};

/**
 * Returns a sorted list of conflicts from most to least severe.
 */
export const sortConflictsBySeverity = (conflicts: RuleConflict[]): RuleConflict[] =>
  conflicts.slice().sort((a, b) => {
    const order: Record<ConflictSeverity, number> = { error: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });
