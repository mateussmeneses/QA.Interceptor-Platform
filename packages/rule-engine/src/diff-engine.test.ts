import { describe, it, expect } from "vitest";
import { diffText, normalizeDiffText } from "./diff-engine";

describe("diffText", () => {
  it("returns no changes for identical text", () => {
    const result = diffText("hello\nworld", "hello\nworld");
    expect(result.hasChanges).toBe(false);
    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(0);
  });

  it("detects added line", () => {
    const result = diffText("line1", "line1\nline2");
    expect(result.hasChanges).toBe(true);
    expect(result.addedCount).toBe(1);
  });

  it("detects removed line", () => {
    const result = diffText("line1\nline2", "line1");
    expect(result.hasChanges).toBe(true);
    expect(result.removedCount).toBe(1);
  });

  it("detects changed line (remove + add)", () => {
    const result = diffText("a", "b");
    expect(result.hasChanges).toBe(true);
  });

  it("left lines length equals right lines length (padding applied)", () => {
    const result = diffText("a\nb", "a\nb\nc");
    expect(result.leftLines.length).toBe(result.rightLines.length);
  });

  it("equal lines are marked as equal on both sides", () => {
    const result = diffText("same\nhere", "same\nhere");
    expect(result.leftLines.every((l) => l.status === "equal")).toBe(true);
    expect(result.rightLines.every((l) => l.status === "equal")).toBe(true);
  });

  it("line numbers start at 1 for non-padding lines", () => {
    const result = diffText("a", "a");
    expect(result.leftLines[0]?.lineNumber).toBe(1);
    expect(result.rightLines[0]?.lineNumber).toBe(1);
  });

  it("padding lines have lineNumber -1", () => {
    const result = diffText("a", "a\nb");
    const paddingLines = result.leftLines.filter((l) => l.lineNumber === -1);
    expect(paddingLines.length).toBeGreaterThan(0);
  });

  it("handles empty left string", () => {
    const result = diffText("", "line");
    expect(result.hasChanges).toBe(true);
    expect(result.addedCount).toBeGreaterThanOrEqual(0);
  });

  it("handles empty right string", () => {
    const result = diffText("line", "");
    expect(result.hasChanges).toBe(true);
  });

  it("handles both strings empty", () => {
    const result = diffText("", "");
    expect(result.hasChanges).toBe(false);
  });

  it("handles multi-line diff with shared prefix", () => {
    const left = "a\nb\nc\nd";
    const right = "a\nb\nX\nd";
    const result = diffText(left, right);
    expect(result.hasChanges).toBe(true);
    // 'c' was replaced with 'X'
    expect(result.removedCount).toBeGreaterThan(0);
    expect(result.addedCount).toBeGreaterThan(0);
  });

  it("handles large identical blocks efficiently", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`).join("\n");
    const result = diffText(lines, lines);
    expect(result.hasChanges).toBe(false);
  });
});

describe("normalizeDiffText", () => {
  it("pretty-prints valid JSON", () => {
    const result = normalizeDiffText('{"a":1}');
    expect(result).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it("returns original text for invalid JSON", () => {
    const input = "not json at all";
    expect(normalizeDiffText(input)).toBe(input);
  });

  it("handles empty string as invalid JSON", () => {
    expect(normalizeDiffText("")).toBe("");
  });

  it("formats nested objects", () => {
    const input = '{"a":{"b":1}}';
    const result = normalizeDiffText(input);
    expect(result).toContain('"b": 1');
  });
});
