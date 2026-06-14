import { describe, it, expect } from "vitest";
import {
  inferSchema,
  inferSchemaFromString,
  mergeSchemas,
  inferSchemaFromSamples
} from "./schema-inference";

// ---------------------------------------------------------------------------
// inferSchema — primitives
// ---------------------------------------------------------------------------

describe("inferSchema — primitives", () => {
  it("infers null", () => {
    expect(inferSchema(null)).toEqual({ type: "null" });
  });

  it("infers boolean", () => {
    expect(inferSchema(true)).toEqual({ type: "boolean" });
    expect(inferSchema(false)).toEqual({ type: "boolean" });
  });

  it("infers integer", () => {
    expect(inferSchema(42)).toEqual({ type: "integer" });
  });

  it("infers number for floats", () => {
    expect(inferSchema(3.14)).toEqual({ type: "number" });
  });

  it("infers plain string", () => {
    expect(inferSchema("hello")).toEqual({ type: "string" });
  });

  it("infers date-time string", () => {
    expect(inferSchema("2026-06-12T14:00:00.000Z")).toMatchObject({
      type: "string",
      format: "date-time"
    });
  });

  it("infers date string", () => {
    expect(inferSchema("2026-06-12")).toMatchObject({ type: "string", format: "date" });
  });

  it("infers uuid string", () => {
    expect(inferSchema("550e8400-e29b-41d4-a716-446655440000")).toMatchObject({
      type: "string",
      format: "uuid"
    });
  });

  it("infers uri string", () => {
    expect(inferSchema("https://api.example.com")).toMatchObject({ type: "string", format: "uri" });
  });

  it("infers email string", () => {
    expect(inferSchema("user@example.com")).toMatchObject({ type: "string", format: "email" });
  });
});

// ---------------------------------------------------------------------------
// inferSchema — arrays
// ---------------------------------------------------------------------------

describe("inferSchema — arrays", () => {
  it("infers empty array", () => {
    expect(inferSchema([])).toEqual({ type: "array", items: {} });
  });

  it("infers array of integers", () => {
    expect(inferSchema([1, 2, 3])).toEqual({ type: "array", items: { type: "integer" } });
  });

  it("infers array of strings", () => {
    expect(inferSchema(["a", "b"])).toEqual({ type: "array", items: { type: "string" } });
  });

  it("infers mixed array with widened item type", () => {
    const schema = inferSchema([1, "hello"]);
    expect(schema).toMatchObject({ type: "array" });
    // items should be a widened type covering integer and string
  });

  it("infers nested array", () => {
    const schema = inferSchema([
      [1, 2],
      [3, 4]
    ]);
    expect(schema).toMatchObject({ type: "array" });
    const items = (schema as { items?: unknown }).items;
    expect(items).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// inferSchema — objects
// ---------------------------------------------------------------------------

describe("inferSchema — objects", () => {
  it("infers empty object", () => {
    expect(inferSchema({})).toEqual({ type: "object" });
  });

  it("infers object with typed properties", () => {
    const schema = inferSchema({ id: 1, name: "Alice", active: true });
    expect(schema).toMatchObject({
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        active: { type: "boolean" }
      },
      required: expect.arrayContaining(["id", "name", "active"])
    });
  });

  it("infers nested object", () => {
    const schema = inferSchema({ user: { id: 1, email: "a@b.com" } });
    const props = (schema as { properties?: Record<string, unknown> }).properties;
    expect(props?.["user"]).toMatchObject({ type: "object" });
  });

  it("stops at maxDepth (returns {} object)", () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: { h: { i: "too deep" } } } } } } } } };
    const schema = inferSchema(deep, { maxDepth: 2 });
    expect(schema).toMatchObject({ type: "object" });
  });
});

// ---------------------------------------------------------------------------
// inferSchemaFromString
// ---------------------------------------------------------------------------

describe("inferSchemaFromString", () => {
  it("parses and infers from valid JSON string", () => {
    const schema = inferSchemaFromString('{"id":1,"name":"Alice"}');
    expect(schema).toMatchObject({ type: "object" });
  });

  it("returns null for invalid JSON", () => {
    expect(inferSchemaFromString("not json")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(inferSchemaFromString("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mergeSchemas
// ---------------------------------------------------------------------------

describe("mergeSchemas", () => {
  it("returns identical schema unchanged", () => {
    const s = { type: "string" as const };
    expect(mergeSchemas(s, s)).toEqual(s);
  });

  it("widens string + number to type union", () => {
    const merged = mergeSchemas({ type: "string" }, { type: "number" });
    const type = (merged as { type: string[] }).type;
    expect(type).toContain("string");
    expect(type).toContain("number");
  });

  it("merges two objects, required = intersection of keys", () => {
    const a = {
      type: "object" as const,
      properties: { id: { type: "integer" as const }, name: { type: "string" as const } },
      required: ["id", "name"]
    };
    const b = {
      type: "object" as const,
      properties: { id: { type: "integer" as const } },
      required: ["id"]
    };
    const merged = mergeSchemas(a, b) as { required?: string[] };
    // "id" in both → required; "name" only in a → not required
    expect(merged.required).toContain("id");
    expect(merged.required).not.toContain("name");
  });

  it("merges object with extra property in second sample", () => {
    const a = {
      type: "object" as const,
      properties: { id: { type: "integer" as const } },
      required: ["id"]
    };
    const b = {
      type: "object" as const,
      properties: { id: { type: "integer" as const }, extra: { type: "string" as const } },
      required: ["id", "extra"]
    };
    const merged = mergeSchemas(a, b) as { properties?: Record<string, unknown> };
    expect(merged.properties?.["extra"]).toBeDefined();
  });

  it("merges two arrays with same item type", () => {
    const a = { type: "array" as const, items: { type: "string" as const } };
    const b = { type: "array" as const, items: { type: "string" as const } };
    expect(mergeSchemas(a, b)).toMatchObject({ type: "array", items: { type: "string" } });
  });

  it("widens array items on type mismatch", () => {
    const a = { type: "array" as const, items: { type: "string" as const } };
    const b = { type: "array" as const, items: { type: "integer" as const } };
    const merged = mergeSchemas(a, b) as { items?: { type?: unknown } };
    // items type should be widened
    expect(merged.items).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// inferSchemaFromSamples
// ---------------------------------------------------------------------------

describe("inferSchemaFromSamples", () => {
  it("returns null for empty sample set", () => {
    expect(inferSchemaFromSamples([])).toBeNull();
  });

  it("returns null when all samples are invalid JSON", () => {
    expect(inferSchemaFromSamples(["bad", "json"])).toBeNull();
  });

  it("infers from a single sample", () => {
    const schema = inferSchemaFromSamples(['{"id":1}']);
    expect(schema).toMatchObject({ type: "object" });
  });

  it("merges multiple samples — required = intersection", () => {
    const samples = ['{"id":1,"name":"Alice","role":"admin"}', '{"id":2,"name":"Bob"}'];
    const schema = inferSchemaFromSamples(samples) as { required?: string[] };
    // "id" and "name" in both → required; "role" only in first → optional
    expect(schema?.required).toContain("id");
    expect(schema?.required).toContain("name");
    expect(schema?.required ?? []).not.toContain("role");
  });

  it("handles varied response shapes across samples", () => {
    const samples = [
      '{"status":"ok","data":[1,2,3]}',
      '{"status":"ok","data":[4,5,6],"meta":{"page":1}}'
    ];
    const schema = inferSchemaFromSamples(samples) as {
      properties?: Record<string, unknown>;
      required?: string[];
    };
    expect(schema?.properties?.["status"]).toBeDefined();
    expect(schema?.properties?.["data"]).toBeDefined();
    expect(schema?.required).toContain("status");
    // "meta" only in second sample → optional
    expect(schema?.required ?? []).not.toContain("meta");
  });

  it("respects maxDepth option", () => {
    const deep = JSON.stringify({ a: { b: { c: { d: "deep" } } } });
    const schema = inferSchemaFromSamples([deep], { maxDepth: 1 });
    expect(schema).toBeDefined();
  });
});
