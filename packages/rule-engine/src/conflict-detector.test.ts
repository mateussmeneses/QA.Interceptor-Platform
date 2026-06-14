import { describe, it, expect } from "vitest";
import {
  detectConflicts,
  groupConflictsByRule,
  sortConflictsBySeverity
} from "./conflict-detector";
import type { Rule } from "@qa-interceptor/shared-types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeRule = (
  overrides: Partial<Rule> & { id: string; name: string; type: Rule["type"] }
): Rule => ({
  priority: 10,
  enabled: true,
  createdAt: new Date().toISOString(),
  condition: {},
  payload: {},
  groupId: undefined,
  ...overrides
});

// ---------------------------------------------------------------------------
// detectConflicts — no conflicts
// ---------------------------------------------------------------------------

describe("detectConflicts — no conflicts", () => {
  it("returns empty report for zero rules", () => {
    const report = detectConflicts([]);
    expect(report.conflicts).toHaveLength(0);
    expect(report.hasErrors).toBe(false);
    expect(report.hasWarnings).toBe(false);
  });

  it("returns empty report for single rule", () => {
    const rules = [makeRule({ id: "r1", name: "A", type: "rewrite-url" })];
    const report = detectConflicts(rules);
    expect(report.conflicts).toHaveLength(0);
  });

  it("ignores disabled rules", () => {
    const rules = [
      makeRule({ id: "r1", name: "A", type: "rewrite-url", enabled: false }),
      makeRule({ id: "r2", name: "B", type: "rewrite-url", enabled: false })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts).toHaveLength(0);
  });

  it("no conflict when methods differ", () => {
    const rules = [
      makeRule({ id: "r1", name: "A", type: "rewrite-url", condition: { method: "GET" } }),
      makeRule({ id: "r2", name: "B", type: "rewrite-url", condition: { method: "POST" } })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts).toHaveLength(0);
  });

  it("no conflict when URL patterns are disjoint", () => {
    const rules = [
      makeRule({
        id: "r1",
        name: "A",
        type: "mock-status",
        condition: { urlContains: "/api/users" }
      }),
      makeRule({
        id: "r2",
        name: "B",
        type: "mock-status",
        condition: { urlContains: "/api/orders" }
      })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts).toHaveLength(0);
  });

  it("no conflict for rules of different dimensions with overlapping URL", () => {
    const rules = [
      makeRule({
        id: "r1",
        name: "A",
        type: "delay",
        priority: 5,
        condition: { urlContains: "/api" }
      }),
      makeRule({
        id: "r2",
        name: "B",
        type: "rewrite-header",
        priority: 10,
        condition: { urlContains: "/api" }
      })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectConflicts — same-dimension-overlap
// ---------------------------------------------------------------------------

describe("detectConflicts — same-dimension-overlap", () => {
  it("detects two rewrite-url rules with overlapping conditions", () => {
    const rules = [
      makeRule({ id: "r1", name: "Rewrite A", type: "rewrite-url" }),
      makeRule({ id: "r2", name: "Rewrite B", type: "rewrite-url" })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts.some((c) => c.kind === "same-dimension-overlap")).toBe(true);
  });

  it("detects two mock-response rules sharing a URL scope", () => {
    const rules = [
      makeRule({
        id: "r1",
        name: "Mock 1",
        type: "mock-response",
        condition: { urlContains: "/api" }
      }),
      makeRule({
        id: "r2",
        name: "Mock 2",
        type: "mock-response",
        condition: { urlContains: "/api/users" }
      })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts.some((c) => c.kind === "same-dimension-overlap")).toBe(true);
  });

  it("detects cross-type dimension conflict: mock-response vs rewrite-response", () => {
    const rules = [
      makeRule({
        id: "r1",
        name: "Mock",
        type: "mock-response",
        condition: { urlContains: "/api" }
      }),
      makeRule({
        id: "r2",
        name: "Rewrite",
        type: "rewrite-response",
        condition: { urlContains: "/api" }
      })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts.some((c) => c.kind === "same-dimension-overlap")).toBe(true);
  });

  it("conflict is a warning (not error) for same-dimension rules", () => {
    const rules = [
      makeRule({ id: "r1", name: "Mock A", type: "mock-status" }),
      makeRule({ id: "r2", name: "Mock B", type: "mock-status" })
    ];
    const report = detectConflicts(rules);
    const conflict = report.conflicts.find((c) => c.kind === "same-dimension-overlap");
    expect(conflict?.severity).toBe("warning");
  });

  it("conflict references both affected rules", () => {
    const rules = [
      makeRule({ id: "r1", name: "A", type: "mock-status" }),
      makeRule({ id: "r2", name: "B", type: "mock-status" })
    ];
    const report = detectConflicts(rules);
    const ids = report.conflicts.flatMap((c) => c.ruleIds);
    expect(ids).toContain("r1");
    expect(ids).toContain("r2");
  });

  it("affectedRuleIds includes both rule IDs", () => {
    const rules = [
      makeRule({ id: "r1", name: "A", type: "mock-response" }),
      makeRule({ id: "r2", name: "B", type: "mock-response" })
    ];
    const report = detectConflicts(rules);
    expect(report.affectedRuleIds.has("r1")).toBe(true);
    expect(report.affectedRuleIds.has("r2")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// detectConflicts — url-shadow
// ---------------------------------------------------------------------------

describe("detectConflicts — url-shadow", () => {
  it("detects block rule with no URL condition shadowing a scoped rule", () => {
    const rules = [
      makeRule({ id: "r1", name: "Block All", type: "block", condition: {} }),
      makeRule({
        id: "r2",
        name: "Mock Users",
        type: "mock-response",
        condition: { urlContains: "/api/users" }
      })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts.some((c) => c.kind === "url-shadow")).toBe(true);
  });

  it("shadow severity is warning", () => {
    const rules = [
      makeRule({ id: "r1", name: "Redirect All", type: "redirect", condition: {} }),
      makeRule({
        id: "r2",
        name: "Rewrite users",
        type: "rewrite-header",
        condition: { urlContains: "/api" }
      })
    ];
    const report = detectConflicts(rules);
    const shadow = report.conflicts.find((c) => c.kind === "url-shadow");
    expect(shadow?.severity).toBe("warning");
  });

  it("no shadow when both rules have URL conditions", () => {
    const rules = [
      makeRule({ id: "r1", name: "Block /a", type: "block", condition: { urlContains: "/a" } }),
      makeRule({
        id: "r2",
        name: "Mock /b",
        type: "mock-response",
        condition: { urlContains: "/a/b" }
      })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts.every((c) => c.kind !== "url-shadow")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// detectConflicts — priority-tie
// ---------------------------------------------------------------------------

describe("detectConflicts — priority-tie", () => {
  it("detects two rules with same priority and overlapping conditions", () => {
    const rules = [
      makeRule({ id: "r1", name: "A", type: "rewrite-header", priority: 5 }),
      makeRule({ id: "r2", name: "B", type: "mock-response", priority: 5 })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts.some((c) => c.kind === "priority-tie")).toBe(true);
  });

  it("priority-tie severity is info", () => {
    const rules = [
      makeRule({ id: "r1", name: "A", type: "delay", priority: 10 }),
      makeRule({ id: "r2", name: "B", type: "block", priority: 10 })
    ];
    const report = detectConflicts(rules);
    const tie = report.conflicts.find((c) => c.kind === "priority-tie");
    expect(tie?.severity).toBe("info");
  });

  it("no priority-tie when priorities differ", () => {
    const rules = [
      makeRule({ id: "r1", name: "A", type: "delay", priority: 5 }),
      makeRule({ id: "r2", name: "B", type: "block", priority: 10 })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts.every((c) => c.kind !== "priority-tie")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// detectConflicts — terminal-unreachable
// ---------------------------------------------------------------------------

describe("detectConflicts — terminal-unreachable", () => {
  it("detects block rule making another rule unreachable", () => {
    const rules = [
      makeRule({ id: "r1", name: "Block", type: "block", priority: 1 }),
      makeRule({ id: "r2", name: "Rewrite", type: "rewrite-url", priority: 10 })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts.some((c) => c.kind === "terminal-unreachable")).toBe(true);
    expect(report.hasErrors).toBe(true);
  });

  it("terminal-unreachable severity is error", () => {
    const rules = [
      makeRule({ id: "r1", name: "Redirect", type: "redirect", priority: 1 }),
      makeRule({ id: "r2", name: "Mock", type: "mock-response", priority: 20 })
    ];
    const report = detectConflicts(rules);
    const conflict = report.conflicts.find((c) => c.kind === "terminal-unreachable");
    expect(conflict?.severity).toBe("error");
  });

  it("no terminal-unreachable when non-terminal rule runs first", () => {
    const rules = [
      makeRule({ id: "r1", name: "Rewrite", type: "rewrite-url", priority: 1 }),
      makeRule({ id: "r2", name: "Block", type: "block", priority: 20 })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts.every((c) => c.kind !== "terminal-unreachable")).toBe(true);
  });

  it("no terminal-unreachable if conditions do not overlap", () => {
    const rules = [
      makeRule({
        id: "r1",
        name: "Block /a",
        type: "block",
        priority: 1,
        condition: { urlContains: "/a" }
      }),
      makeRule({
        id: "r2",
        name: "Mock /b",
        type: "mock-response",
        priority: 20,
        condition: { urlContains: "/b" }
      })
    ];
    const report = detectConflicts(rules);
    expect(report.conflicts.every((c) => c.kind !== "terminal-unreachable")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// groupConflictsByRule
// ---------------------------------------------------------------------------

describe("groupConflictsByRule", () => {
  it("groups conflicts by each affected rule ID", () => {
    const rules = [
      makeRule({ id: "r1", name: "A", type: "mock-response" }),
      makeRule({ id: "r2", name: "B", type: "mock-response" })
    ];
    const report = detectConflicts(rules);
    const grouped = groupConflictsByRule(report);
    expect(grouped.has("r1")).toBe(true);
    expect(grouped.has("r2")).toBe(true);
  });

  it("returns empty map for empty conflict report", () => {
    const report = detectConflicts([]);
    const grouped = groupConflictsByRule(report);
    expect(grouped.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sortConflictsBySeverity
// ---------------------------------------------------------------------------

describe("sortConflictsBySeverity", () => {
  it("errors come before warnings, warnings before infos", () => {
    const rules = [
      makeRule({ id: "r1", name: "Block", type: "block", priority: 1 }),
      makeRule({ id: "r2", name: "Mock", type: "mock-response", priority: 10 }),
      makeRule({ id: "r3", name: "Mock2", type: "mock-response", priority: 10 })
    ];
    const report = detectConflicts(rules);
    const sorted = sortConflictsBySeverity(report.conflicts);

    const severities = sorted.map((c) => c.severity);
    const errorIdx = severities.lastIndexOf("error");
    const warnIdx = severities.indexOf("warning");
    const infoIdx = severities.indexOf("info");

    if (errorIdx !== -1 && warnIdx !== -1) {
      expect(errorIdx).toBeLessThan(warnIdx);
    }

    if (warnIdx !== -1 && infoIdx !== -1) {
      expect(warnIdx).toBeLessThan(infoIdx);
    }
  });

  it("does not mutate the original array", () => {
    const input = [
      {
        kind: "priority-tie" as const,
        severity: "info" as const,
        ruleIds: ["a", "b"] as [string, string],
        ruleNames: ["A", "B"] as [string, string],
        description: "",
        suggestion: ""
      },
      {
        kind: "terminal-unreachable" as const,
        severity: "error" as const,
        ruleIds: ["c", "d"] as [string, string],
        ruleNames: ["C", "D"] as [string, string],
        description: "",
        suggestion: ""
      }
    ];
    const copy = [...input];
    sortConflictsBySeverity(input);
    expect(input).toEqual(copy);
  });
});
