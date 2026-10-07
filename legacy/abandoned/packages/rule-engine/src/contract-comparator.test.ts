import { describe, it, expect } from "vitest";
import { compareContracts, compareContractStrings } from "./contract-comparator.js";

// ---------------------------------------------------------------------------
// compareContractStrings — JSON parsing
// ---------------------------------------------------------------------------

describe("compareContractStrings — JSON parsing", () => {
  it("returns diff when expected is not valid JSON", () => {
    const result = compareContractStrings("<html>", '{"ok":true}');
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs[0].path).toBe("$");
    }
  });

  it("returns diff when actual is not valid JSON", () => {
    const result = compareContractStrings('{"ok":true}', "not json");
    expect(result.match).toBe(false);
  });

  it("matches two identical JSON strings", () => {
    const result = compareContractStrings('{"id":1}', '{"id":2}');
    expect(result.match).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Primitive values
// ---------------------------------------------------------------------------

describe("compareContracts — primitives", () => {
  it("matches when both are strings", () => {
    expect(compareContracts("hello", "world").match).toBe(true);
  });

  it("matches when both are numbers", () => {
    expect(compareContracts(1, 99).match).toBe(true);
  });

  it("matches when both are booleans", () => {
    expect(compareContracts(true, false).match).toBe(true);
  });

  it("matches when both are null", () => {
    expect(compareContracts(null, null).match).toBe(true);
  });

  it("reports type-change when types differ", () => {
    const result = compareContracts("string", 42);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs[0].type).toBe("type-change");
      expect(result.diffs[0].expected).toBe("string");
      expect(result.diffs[0].actual).toBe("number");
    }
  });

  it("reports null-change when expected is null and actual is not", () => {
    const result = compareContracts(null, "something");
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs[0].type).toBe("null-change");
    }
  });

  it("reports null-change when actual is null and expected is not", () => {
    const result = compareContracts("expected", null);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs[0].type).toBe("null-change");
    }
  });
});

// ---------------------------------------------------------------------------
// Object comparison
// ---------------------------------------------------------------------------

describe("compareContracts — objects", () => {
  it("matches identical object shapes", () => {
    const expected = { id: 1, name: "Alice", active: true };
    const actual = { id: 2, name: "Bob", active: false };
    expect(compareContracts(expected, actual).match).toBe(true);
  });

  it("detects missing key", () => {
    const expected = { id: 1, name: "Alice" };
    const actual = { id: 2 };
    const result = compareContracts(expected, actual);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs.some((d) => d.type === "missing-key" && d.path === "$.name")).toBe(true);
    }
  });

  it("detects extra key", () => {
    const expected = { id: 1 };
    const actual = { id: 2, extra: "surprise" };
    const result = compareContracts(expected, actual);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs.some((d) => d.type === "extra-key" && d.path === "$.extra")).toBe(true);
    }
  });

  it("detects type change in nested property", () => {
    const expected = { user: { id: 1 } };
    const actual = { user: "Alice" };
    const result = compareContracts(expected, actual);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs[0].path).toBe("$.user");
      expect(result.diffs[0].type).toBe("type-change");
    }
  });

  it("recurses into nested objects", () => {
    const expected = { user: { id: 1, name: "Alice", role: "admin" } };
    const actual = { user: { id: 2, name: "Bob" } };
    const result = compareContracts(expected, actual);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs.some((d) => d.path === "$.user.role")).toBe(true);
    }
  });

  it("matches when one value is null and both have same null state", () => {
    const expected = { id: 1, description: null };
    const actual = { id: 2, description: null };
    expect(compareContracts(expected, actual).match).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Array comparison
// ---------------------------------------------------------------------------

describe("compareContracts — arrays", () => {
  it("matches when both are arrays with same item shape", () => {
    const expected = [{ id: 1, name: "A" }];
    const actual = [
      { id: 2, name: "B" },
      { id: 3, name: "C" }
    ];
    expect(compareContracts(expected, actual).match).toBe(true);
  });

  it("detects type change in array context", () => {
    const expected = [{ id: 1 }];
    const actual = ["string"];
    const result = compareContracts(expected, actual);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs[0].path).toBe("$[0]");
    }
  });

  it("reports missing-key when expected array has items but actual is empty", () => {
    const expected = [{ id: 1 }];
    const actual: unknown[] = [];
    const result = compareContracts(expected, actual);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs[0].type).toBe("missing-key");
    }
  });

  it("does not report diff when expected array is empty and actual has items", () => {
    expect(compareContracts([], [{ id: 1 }]).match).toBe(true);
  });

  it("reports type-change when expected is array and actual is object", () => {
    const result = compareContracts([1, 2], { a: 1 });
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs[0].type).toBe("type-change");
    }
  });
});

// ---------------------------------------------------------------------------
// Real-world API contract drift scenarios
// ---------------------------------------------------------------------------

describe("compareContracts — real-world scenarios", () => {
  const expectedResponse = {
    user: {
      id: 1,
      name: "Alice",
      email: "alice@example.com",
      role: "admin"
    },
    permissions: ["read", "write"],
    meta: { createdAt: "2026-01-01", updatedAt: "2026-01-01" }
  };

  it("matches when values change but structure is preserved", () => {
    const actualResponse = {
      user: {
        id: 42,
        name: "Bob",
        email: "bob@example.com",
        role: "user"
      },
      permissions: ["read"],
      meta: { createdAt: "2026-06-01", updatedAt: "2026-06-12" }
    };
    expect(compareContracts(expectedResponse, actualResponse).match).toBe(true);
  });

  it("detects when a field is removed from the API response", () => {
    const actual = {
      user: {
        id: 42,
        name: "Bob",
        // email removed
        role: "user"
      },
      permissions: ["read"],
      meta: { createdAt: "2026-06-01", updatedAt: "2026-06-12" }
    };
    const result = compareContracts(expectedResponse, actual);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs.some((d) => d.path === "$.user.email")).toBe(true);
    }
  });

  it("detects when a field type changes (e.g., number to string)", () => {
    const actual = {
      user: {
        id: "user_42", // was number, now string
        name: "Bob",
        email: "bob@example.com",
        role: "user"
      },
      permissions: ["read"],
      meta: { createdAt: "2026-06-01", updatedAt: "2026-06-12" }
    };
    const result = compareContracts(expectedResponse, actual);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs.some((d) => d.path === "$.user.id" && d.type === "type-change")).toBe(
        true
      );
    }
  });

  it("detects when array field becomes object", () => {
    const actual = {
      user: {
        id: 1,
        name: "Alice",
        email: "alice@example.com",
        role: "admin"
      },
      permissions: { read: true }, // was array, now object
      meta: { createdAt: "2026-01-01", updatedAt: "2026-01-01" }
    };
    const result = compareContracts(expectedResponse, actual);
    expect(result.match).toBe(false);
    if (!result.match) {
      expect(result.diffs.some((d) => d.path === "$.permissions" && d.type === "type-change")).toBe(
        true
      );
    }
  });
});
