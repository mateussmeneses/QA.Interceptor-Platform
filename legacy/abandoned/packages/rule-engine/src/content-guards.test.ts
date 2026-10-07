import { describe, it, expect } from "vitest";
import { isContentRule, isContentMockEnvVar, isContentConditionalMock } from "./content-guards.js";

const validRule = {
  id: "r1",
  name: "Rule",
  type: "mock-response",
  enabled: true,
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  condition: { urlContains: "/api" },
  payload: { body: "{}" }
};

const validEnvVar = {
  id: "e1",
  name: "token",
  value: "abc",
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z"
};

const validConditionalMock = {
  id: "c1",
  name: "Seq",
  enabled: true,
  urlContains: "/api/login",
  branches: [{ id: "b1", status: 200, body: "{}" }],
  createdAt: "2026-01-01T00:00:00.000Z"
};

describe("isContentRule", () => {
  it("accepts a valid rule", () => {
    expect(isContentRule(validRule)).toBe(true);
  });

  it("rejects non-objects and arrays", () => {
    expect(isContentRule(null)).toBe(false);
    expect(isContentRule("x")).toBe(false);
    expect(isContentRule([validRule])).toBe(false);
  });

  it("rejects when a required field is missing or wrong type", () => {
    expect(isContentRule({ ...validRule, id: 1 })).toBe(false);
    expect(isContentRule({ ...validRule, condition: null })).toBe(false);
    expect(isContentRule({ ...validRule, payload: "x" })).toBe(false);
    expect(isContentRule({ ...validRule, enabled: "yes" })).toBe(false);
  });
});

describe("isContentMockEnvVar", () => {
  it("accepts a valid env var with and without scope", () => {
    expect(isContentMockEnvVar(validEnvVar)).toBe(true);
    expect(isContentMockEnvVar({ ...validEnvVar, scopeUrlContains: "/api" })).toBe(true);
  });

  it("rejects invalid scope type and missing fields", () => {
    expect(isContentMockEnvVar({ ...validEnvVar, scopeUrlContains: 1 })).toBe(false);
    expect(isContentMockEnvVar({ ...validEnvVar, value: undefined })).toBe(false);
    expect(isContentMockEnvVar(null)).toBe(false);
  });
});

describe("isContentConditionalMock", () => {
  it("accepts a valid conditional mock", () => {
    expect(isContentConditionalMock(validConditionalMock)).toBe(true);
    expect(isContentConditionalMock({ ...validConditionalMock, method: "POST" })).toBe(true);
  });

  it("rejects invalid method type and non-array branches", () => {
    expect(isContentConditionalMock({ ...validConditionalMock, method: 5 })).toBe(false);
    expect(isContentConditionalMock({ ...validConditionalMock, branches: "x" })).toBe(false);
    expect(isContentConditionalMock(undefined)).toBe(false);
  });
});
