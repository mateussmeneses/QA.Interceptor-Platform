/**
 * JSON Schema inference engine.
 *
 * Derives a JSON Schema draft-07 description from one or more observed
 * JSON values (e.g. captured API responses). Feeds AI-001 (auto-generate
 * schema from traffic) and supports assertion suggestion.
 *
 * Architectural contract:
 *   - Pure functions only. No DOM, no chrome API, no I/O.
 *   - The output schema is compatible with schema-validator.ts.
 *   - Merging multiple samples is incremental: pass each response body
 *     through inferSchema() then mergeSchemas() to widen the union.
 *
 * Design decisions:
 *   - Infer types strictly (no coercion).
 *   - For object properties: mark a property as required only when it appears
 *     in ALL observed samples for that object position.
 *   - For arrays: infer the items schema from all observed array elements.
 *   - Nullable: when a property is sometimes null and sometimes typed, emit
 *     { type: [..., "null"] } widened schema.
 *   - Depth limit: stop recursing at MAX_DEPTH to avoid pathological schemas.
 */

import type { JsonSchema } from "./schema-validator.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InferenceOptions = {
  /**
   * Maximum object nesting depth. Deeper values become `{}` (any object).
   * Default: 8
   */
  maxDepth?: number;

  /**
   * Maximum number of array items to sample for element type inference.
   * Default: 20
   */
  maxArraySample?: number;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_ARRAY_SAMPLE = 20;

/**
 * Infer a JSON Schema from a single parsed JSON value.
 */
export const inferSchema = (
  value: unknown,
  options: InferenceOptions = {}
): JsonSchema => {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxArraySample = options.maxArraySample ?? DEFAULT_MAX_ARRAY_SAMPLE;
  return inferValue(value, 0, maxDepth, maxArraySample);
};

/**
 * Infer a JSON Schema from a JSON string.
 * Returns null if the string is not valid JSON.
 */
export const inferSchemaFromString = (
  jsonText: string,
  options: InferenceOptions = {}
): JsonSchema | null => {
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return inferSchema(parsed, options);
  } catch {
    return null;
  }
};

/**
 * Merge two inferred schemas into a widened schema.
 * Used to build a schema that accepts all observed sample values.
 *
 * Examples:
 *   merge(string, string) → string
 *   merge(string, number) → { type: ["string","number"] }
 *   merge(object{a:string}, object{a:string,b:number}) → object{a:string, b?:number}
 */
export const mergeSchemas = (a: JsonSchema, b: JsonSchema): JsonSchema => {
  // Identical schemas — return as-is
  if (JSON.stringify(a) === JSON.stringify(b)) {
    return a;
  }

  const typeA = getSchemaType(a);
  const typeB = getSchemaType(b);

  if (typeA !== typeB) {
    // Different primitive types → emit type union
    const typesA = Array.isArray(typeA) ? typeA : [typeA];
    const typesB = Array.isArray(typeB) ? typeB : [typeB];
    const merged = [...new Set([...typesA, ...typesB])];
    return { type: merged as JsonSchema["type"] };
  }

  if (typeA === "object" && typeB === "object") {
    return mergeObjectSchemas(a, b);
  }

  if (typeA === "array" && typeB === "array") {
    return mergeArraySchemas(a, b);
  }

  // Same primitive type — return either (they're equivalent)
  return a;
};

// ---------------------------------------------------------------------------
// Core inference
// ---------------------------------------------------------------------------

const inferValue = (
  value: unknown,
  depth: number,
  maxDepth: number,
  maxArraySample: number
): JsonSchema => {
  if (value === null) {
    return { type: "null" };
  }

  if (typeof value === "boolean") {
    return { type: "boolean" };
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { type: "integer" };
    }

    return { type: "number" };
  }

  if (typeof value === "string") {
    return inferStringSchema(value);
  }

  if (Array.isArray(value)) {
    return inferArraySchema(value, depth, maxDepth, maxArraySample);
  }

  if (typeof value === "object") {
    return inferObjectSchema(value as Record<string, unknown>, depth, maxDepth, maxArraySample);
  }

  return {};
};

const inferStringSchema = (value: string): JsonSchema => {
  // Detect well-known string formats
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return { type: "string", format: "date-time" };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { type: "string", format: "date" };
  }

  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
    return { type: "string", format: "uuid" };
  }

  if (/^https?:\/\//.test(value)) {
    return { type: "string", format: "uri" };
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { type: "string", format: "email" };
  }

  return { type: "string" };
};

const inferArraySchema = (
  value: unknown[],
  depth: number,
  maxDepth: number,
  maxArraySample: number
): JsonSchema => {
  if (value.length === 0) {
    return { type: "array", items: {} };
  }

  const sample = value.slice(0, maxArraySample);
  const itemSchemas = sample.map((item) => inferValue(item, depth + 1, maxDepth, maxArraySample));

  if (itemSchemas.length === 1) {
    return { type: "array", items: itemSchemas[0] };
  }

  // Merge all item schemas
  const merged = itemSchemas.slice(1).reduce(
    (acc, schema) => mergeSchemas(acc, schema),
    itemSchemas[0] as JsonSchema
  );

  return { type: "array", items: merged };
};

const inferObjectSchema = (
  value: Record<string, unknown>,
  depth: number,
  maxDepth: number,
  maxArraySample: number
): JsonSchema => {
  if (depth >= maxDepth) {
    return { type: "object" };
  }

  const keys = Object.keys(value);

  if (keys.length === 0) {
    return { type: "object" };
  }

  const properties: Record<string, JsonSchema> = {};

  for (const key of keys) {
    properties[key] = inferValue(value[key], depth + 1, maxDepth, maxArraySample);
  }

  return {
    type: "object",
    properties,
    required: keys,
  };
};

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

const mergeObjectSchemas = (a: JsonSchema, b: JsonSchema): JsonSchema => {
  const propsA = (a as { properties?: Record<string, JsonSchema> }).properties ?? {};
  const propsB = (b as { properties?: Record<string, JsonSchema> }).properties ?? {};
  const requiredA = new Set<string>((a as { required?: string[] }).required ?? []);
  const requiredB = new Set<string>((b as { required?: string[] }).required ?? []);

  const allKeys = new Set([...Object.keys(propsA), ...Object.keys(propsB)]);
  const mergedProps: Record<string, JsonSchema> = {};

  for (const key of allKeys) {
    const schemaA = propsA[key];
    const schemaB = propsB[key];

    if (schemaA && schemaB) {
      mergedProps[key] = mergeSchemas(schemaA, schemaB);
    } else {
      // Property exists in only one sample — it is nullable in the other
      mergedProps[key] = schemaA ?? schemaB ?? {};
    }
  }

  // A property is required only if it was required in BOTH schemas
  const required = [...allKeys].filter(
    (k) => requiredA.has(k) && requiredB.has(k)
  );

  return {
    type: "object",
    properties: mergedProps,
    ...(required.length > 0 ? { required } : {}),
  };
};

const mergeArraySchemas = (a: JsonSchema, b: JsonSchema): JsonSchema => {
  const itemsA = (a as { items?: JsonSchema }).items;
  const itemsB = (b as { items?: JsonSchema }).items;

  if (!itemsA || !itemsB) {
    return { type: "array", items: itemsA ?? itemsB ?? {} };
  }

  return { type: "array", items: mergeSchemas(itemsA, itemsB) };
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

const getSchemaType = (schema: JsonSchema): string | string[] | undefined => {
  if (typeof schema === "boolean") {
    return undefined;
  }

  return (schema as { type?: string | string[] }).type;
};

/**
 * Infer schemas from multiple JSON response bodies and merge them into
 * a single schema that describes all observed shapes.
 *
 * Returns null if no valid samples are provided.
 */
export const inferSchemaFromSamples = (
  samples: string[],
  options: InferenceOptions = {}
): JsonSchema | null => {
  const schemas: JsonSchema[] = [];

  for (const sample of samples) {
    const schema = inferSchemaFromString(sample, options);

    if (schema !== null) {
      schemas.push(schema);
    }
  }

  if (schemas.length === 0) {
    return null;
  }

  return schemas.slice(1).reduce(
    (acc, schema) => mergeSchemas(acc, schema),
    schemas[0] as JsonSchema
  );
};
