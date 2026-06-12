import { describe, it, expect } from "vitest";
import { validateJsonSchema, validateJsonString, type JsonSchema } from "./schema-validator.js";

// ---------------------------------------------------------------------------
// validateJsonString — JSON parse errors
// ---------------------------------------------------------------------------

describe("validateJsonString — JSON parsing", () => {
  it("returns invalid when body is not valid JSON", () => {
    const result = validateJsonString("<html>error</html>", { type: "object" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].message).toContain("not valid JSON");
    }
  });

  it("parses and validates a valid JSON string", () => {
    const result = validateJsonString('{"id":1}', { type: "object" });
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// type keyword
// ---------------------------------------------------------------------------

describe("validateJsonSchema — type", () => {
  it("passes for matching type: string", () => {
    expect(validateJsonSchema("hello", { type: "string" }).valid).toBe(true);
  });

  it("fails for non-matching type", () => {
    const result = validateJsonSchema(123, { type: "string" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].path).toBe("$");
    }
  });

  it("passes for type array (union)", () => {
    expect(validateJsonSchema(null, { type: ["string", "null"] }).valid).toBe(true);
  });

  it("passes integer type for integer value", () => {
    expect(validateJsonSchema(5, { type: "integer" }).valid).toBe(true);
  });

  it("fails integer type for float value", () => {
    expect(validateJsonSchema(5.5, { type: "integer" }).valid).toBe(false);
  });

  it("passes null type for null value", () => {
    expect(validateJsonSchema(null, { type: "null" }).valid).toBe(true);
  });

  it("passes object type for plain object", () => {
    expect(validateJsonSchema({ a: 1 }, { type: "object" }).valid).toBe(true);
  });

  it("fails object type for array", () => {
    expect(validateJsonSchema([1], { type: "object" }).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// properties + required
// ---------------------------------------------------------------------------

describe("validateJsonSchema — properties and required", () => {
  const schema: JsonSchema = {
    type: "object",
    properties: {
      id: { type: "number" },
      name: { type: "string" },
    },
    required: ["id", "name"],
  };

  it("passes when all required properties exist with correct types", () => {
    expect(validateJsonSchema({ id: 1, name: "Alice" }, schema).valid).toBe(true);
  });

  it("fails when required property is missing", () => {
    const result = validateJsonSchema({ id: 1 }, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.message.includes("name"))).toBe(true);
    }
  });

  it("fails when property has wrong type", () => {
    const result = validateJsonSchema({ id: "one", name: "Alice" }, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].path).toBe("$.id");
    }
  });

  it("ignores extra properties when additionalProperties is not false", () => {
    expect(validateJsonSchema({ id: 1, name: "Alice", extra: true }, schema).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// additionalProperties
// ---------------------------------------------------------------------------

describe("validateJsonSchema — additionalProperties", () => {
  it("fails when additionalProperties is false and extra key is present", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: { id: { type: "number" } },
      additionalProperties: false,
    };
    const result = validateJsonSchema({ id: 1, extra: "x" }, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.message.includes("extra"))).toBe(true);
    }
  });

  it("validates additional properties against schema when provided", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: { id: { type: "number" } },
      additionalProperties: { type: "string" },
    };
    expect(validateJsonSchema({ id: 1, note: "ok" }, schema).valid).toBe(true);
    expect(validateJsonSchema({ id: 1, note: 42 }, schema).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// String keywords
// ---------------------------------------------------------------------------

describe("validateJsonSchema — string keywords", () => {
  it("passes minLength", () => {
    expect(validateJsonSchema("hello", { type: "string", minLength: 3 }).valid).toBe(true);
  });

  it("fails minLength", () => {
    expect(validateJsonSchema("hi", { type: "string", minLength: 3 }).valid).toBe(false);
  });

  it("passes maxLength", () => {
    expect(validateJsonSchema("hi", { type: "string", maxLength: 5 }).valid).toBe(true);
  });

  it("fails maxLength", () => {
    expect(validateJsonSchema("toolong", { type: "string", maxLength: 5 }).valid).toBe(false);
  });

  it("passes pattern", () => {
    expect(validateJsonSchema("abc123", { type: "string", pattern: "^[a-z]+[0-9]+$" }).valid).toBe(true);
  });

  it("fails pattern", () => {
    expect(validateJsonSchema("!!!!", { type: "string", pattern: "^[a-z]+$" }).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Number keywords
// ---------------------------------------------------------------------------

describe("validateJsonSchema — number keywords", () => {
  it("passes minimum", () => {
    expect(validateJsonSchema(5, { type: "number", minimum: 1 }).valid).toBe(true);
  });

  it("fails minimum", () => {
    expect(validateJsonSchema(0, { type: "number", minimum: 1 }).valid).toBe(false);
  });

  it("passes maximum", () => {
    expect(validateJsonSchema(10, { type: "number", maximum: 100 }).valid).toBe(true);
  });

  it("fails maximum", () => {
    expect(validateJsonSchema(200, { type: "number", maximum: 100 }).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Array keywords
// ---------------------------------------------------------------------------

describe("validateJsonSchema — array keywords", () => {
  it("passes minItems", () => {
    expect(validateJsonSchema([1, 2], { type: "array", minItems: 2 }).valid).toBe(true);
  });

  it("fails minItems", () => {
    expect(validateJsonSchema([1], { type: "array", minItems: 2 }).valid).toBe(false);
  });

  it("passes maxItems", () => {
    expect(validateJsonSchema([1], { type: "array", maxItems: 3 }).valid).toBe(true);
  });

  it("fails maxItems", () => {
    expect(validateJsonSchema([1, 2, 3, 4], { type: "array", maxItems: 3 }).valid).toBe(false);
  });

  it("validates items schema", () => {
    const schema: JsonSchema = { type: "array", items: { type: "number" } };
    expect(validateJsonSchema([1, 2, 3], schema).valid).toBe(true);
    const result = validateJsonSchema([1, "two", 3], schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].path).toBe("$[1]");
    }
  });
});

// ---------------------------------------------------------------------------
// enum / const
// ---------------------------------------------------------------------------

describe("validateJsonSchema — enum and const", () => {
  it("passes for value in enum", () => {
    expect(validateJsonSchema("a", { enum: ["a", "b", "c"] }).valid).toBe(true);
  });

  it("fails for value not in enum", () => {
    expect(validateJsonSchema("d", { enum: ["a", "b"] }).valid).toBe(false);
  });

  it("passes for matching const", () => {
    expect(validateJsonSchema(42, { const: 42 }).valid).toBe(true);
  });

  it("fails for non-matching const", () => {
    expect(validateJsonSchema(43, { const: 42 }).valid).toBe(false);
  });

  it("passes for object const", () => {
    expect(validateJsonSchema({ ok: true }, { const: { ok: true } }).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// not / allOf / anyOf / oneOf
// ---------------------------------------------------------------------------

describe("validateJsonSchema — composition keywords", () => {
  it("not: passes when value does NOT match the not schema", () => {
    expect(validateJsonSchema("hello", { not: { type: "number" } }).valid).toBe(true);
  });

  it("not: fails when value matches the not schema", () => {
    expect(validateJsonSchema(42, { not: { type: "number" } }).valid).toBe(false);
  });

  it("allOf: passes when all schemas pass", () => {
    const schema: JsonSchema = {
      allOf: [{ type: "number" }, { minimum: 5 }],
    };
    expect(validateJsonSchema(10, schema).valid).toBe(true);
  });

  it("allOf: fails when one schema fails", () => {
    const schema: JsonSchema = {
      allOf: [{ type: "number" }, { minimum: 20 }],
    };
    expect(validateJsonSchema(10, schema).valid).toBe(false);
  });

  it("anyOf: passes when at least one schema matches", () => {
    const schema: JsonSchema = {
      anyOf: [{ type: "string" }, { type: "number" }],
    };
    expect(validateJsonSchema(42, schema).valid).toBe(true);
  });

  it("anyOf: fails when no schema matches", () => {
    const schema: JsonSchema = {
      anyOf: [{ type: "string" }, { type: "boolean" }],
    };
    expect(validateJsonSchema(42, schema).valid).toBe(false);
  });

  it("oneOf: passes when exactly one schema matches", () => {
    const schema: JsonSchema = {
      oneOf: [{ type: "string" }, { type: "number" }],
    };
    expect(validateJsonSchema(42, schema).valid).toBe(true);
  });

  it("oneOf: fails when more than one schema matches", () => {
    const schema: JsonSchema = {
      oneOf: [{ type: "number" }, { minimum: 1 }],
    };
    expect(validateJsonSchema(5, schema).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Real-world API response scenarios
// ---------------------------------------------------------------------------

describe("validateJsonSchema — real-world scenarios", () => {
  const userSchema: JsonSchema = {
    type: "object",
    required: ["id", "name", "email"],
    properties: {
      id: { type: "integer" },
      name: { type: "string", minLength: 1 },
      email: { type: "string", pattern: "^.+@.+\\..+$" },
      role: { enum: ["admin", "user", "guest"] },
    },
    additionalProperties: false,
  };

  it("passes for valid user object", () => {
    const value = { id: 1, name: "Alice", email: "alice@example.com", role: "admin" };
    expect(validateJsonSchema(value, userSchema).valid).toBe(true);
  });

  it("fails for missing required field", () => {
    const value = { id: 1, name: "Alice" };
    const result = validateJsonSchema(value, userSchema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.message.includes("email"))).toBe(true);
    }
  });

  it("fails for invalid email pattern", () => {
    const value = { id: 1, name: "Alice", email: "not-an-email" };
    const result = validateJsonSchema(value, userSchema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].path).toBe("$.email");
    }
  });

  it("fails for invalid role enum", () => {
    const value = { id: 1, name: "Alice", email: "a@b.com", role: "superadmin" };
    const result = validateJsonSchema(value, userSchema);
    expect(result.valid).toBe(false);
  });

  it("fails for additional property when not allowed", () => {
    const value = { id: 1, name: "Alice", email: "a@b.com", unknown: true };
    const result = validateJsonSchema(value, userSchema);
    expect(result.valid).toBe(false);
  });
});
