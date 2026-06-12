/**
 * JSON Schema validator (QP-002).
 * Validates a JSON value against a minimal JSON Schema subset (draft-07 compatible).
 * No external dependencies — covers the types QA engineers need daily.
 *
 * Supported keywords:
 *   type, properties, required, additionalProperties,
 *   items, minItems, maxItems, minimum, maximum,
 *   minLength, maxLength, pattern, enum, const, not, allOf, anyOf, oneOf
 */

export type JsonSchemaValidationError = {
  path: string;
  message: string;
};

export type JsonSchemaValidationResult =
  | { valid: true }
  | { valid: false; errors: JsonSchemaValidationError[] };

// JSON Schema node — intentionally loose to allow arbitrary schemas
export type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  const?: unknown;
  not?: JsonSchema;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  $schema?: string;
  title?: string;
  description?: string;
  /** Informational format hint (date-time, date, uuid, uri, email). Not validated, only annotated. */
  format?: string;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export const validateJsonSchema = (
  value: unknown,
  schema: JsonSchema
): JsonSchemaValidationResult => {
  const errors: JsonSchemaValidationError[] = [];
  validateNode(value, schema, "$", errors);

  if (errors.length === 0) {
    return { valid: true };
  }

  return { valid: false, errors };
};

/**
 * Convenience: parse JSON string then validate.
 * Returns an error if the string is not valid JSON.
 */
export const validateJsonString = (
  jsonString: string,
  schema: JsonSchema
): JsonSchemaValidationResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      valid: false,
      errors: [{ path: "$", message: "Response body is not valid JSON." }],
    };
  }

  return validateJsonSchema(parsed, schema);
};

// ---------------------------------------------------------------------------
// Core node validator
// ---------------------------------------------------------------------------

const validateNode = (
  value: unknown,
  schema: JsonSchema,
  path: string,
  errors: JsonSchemaValidationError[]
): void => {
  // type
  if (schema.type !== undefined) {
    validateType(value, schema.type, path, errors);
  }

  // const
  if ("const" in schema) {
    if (!deepEqual(value, schema.const)) {
      errors.push({ path, message: `Expected const value ${JSON.stringify(schema.const)}.` });
    }
  }

  // enum
  if (schema.enum !== undefined) {
    if (!schema.enum.some((allowed) => deepEqual(value, allowed))) {
      errors.push({
        path,
        message: `Value must be one of: ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}.`,
      });
    }
  }

  // not
  if (schema.not !== undefined) {
    const notResult: JsonSchemaValidationError[] = [];
    validateNode(value, schema.not, path, notResult);

    if (notResult.length === 0) {
      errors.push({ path, message: "Value must NOT match the 'not' schema." });
    }
  }

  // allOf
  if (schema.allOf !== undefined) {
    for (const subSchema of schema.allOf) {
      validateNode(value, subSchema, path, errors);
    }
  }

  // anyOf
  if (schema.anyOf !== undefined) {
    const valid = schema.anyOf.some((subSchema) => {
      const subErrors: JsonSchemaValidationError[] = [];
      validateNode(value, subSchema, path, subErrors);
      return subErrors.length === 0;
    });

    if (!valid) {
      errors.push({ path, message: "Value must match at least one of the 'anyOf' schemas." });
    }
  }

  // oneOf
  if (schema.oneOf !== undefined) {
    const matchCount = schema.oneOf.filter((subSchema) => {
      const subErrors: JsonSchemaValidationError[] = [];
      validateNode(value, subSchema, path, subErrors);
      return subErrors.length === 0;
    }).length;

    if (matchCount !== 1) {
      errors.push({
        path,
        message: `Value must match exactly one of the 'oneOf' schemas (matched ${matchCount}).`,
      });
    }
  }

  // Type-specific keywords
  if (typeof value === "string") {
    validateString(value, schema, path, errors);
  } else if (typeof value === "number") {
    validateNumber(value, schema, path, errors);
  } else if (Array.isArray(value)) {
    validateArray(value, schema, path, errors);
  } else if (value !== null && typeof value === "object") {
    validateObject(value as Record<string, unknown>, schema, path, errors);
  }
};

// ---------------------------------------------------------------------------
// Type validation
// ---------------------------------------------------------------------------

const SCHEMA_TYPES: Record<string, (v: unknown) => boolean> = {
  string: (v) => typeof v === "string",
  number: (v) => typeof v === "number",
  integer: (v) => typeof v === "number" && Number.isInteger(v),
  boolean: (v) => typeof v === "boolean",
  null: (v) => v === null,
  array: (v) => Array.isArray(v),
  object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
};

const validateType = (
  value: unknown,
  type: string | string[],
  path: string,
  errors: JsonSchemaValidationError[]
): void => {
  const types = Array.isArray(type) ? type : [type];
  const valid = types.some((t) => SCHEMA_TYPES[t]?.(value) ?? false);

  if (!valid) {
    errors.push({
      path,
      message: `Expected type ${types.join(" | ")}, got ${getTypeName(value)}.`,
    });
  }
};

const getTypeName = (value: unknown): string => {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
};

// ---------------------------------------------------------------------------
// String validation
// ---------------------------------------------------------------------------

const validateString = (
  value: string,
  schema: JsonSchema,
  path: string,
  errors: JsonSchemaValidationError[]
): void => {
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push({ path, message: `String length ${value.length} is less than minLength ${schema.minLength}.` });
  }

  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push({ path, message: `String length ${value.length} exceeds maxLength ${schema.maxLength}.` });
  }

  if (schema.pattern !== undefined) {
    try {
      if (!new RegExp(schema.pattern).test(value)) {
        errors.push({ path, message: `String does not match pattern /${schema.pattern}/.` });
      }
    } catch {
      errors.push({ path, message: `Pattern /${schema.pattern}/ is not a valid regular expression.` });
    }
  }
};

// ---------------------------------------------------------------------------
// Number validation
// ---------------------------------------------------------------------------

const validateNumber = (
  value: number,
  schema: JsonSchema,
  path: string,
  errors: JsonSchemaValidationError[]
): void => {
  if (schema.minimum !== undefined && value < schema.minimum) {
    errors.push({ path, message: `${value} is less than minimum ${schema.minimum}.` });
  }

  if (schema.maximum !== undefined && value > schema.maximum) {
    errors.push({ path, message: `${value} exceeds maximum ${schema.maximum}.` });
  }
};

// ---------------------------------------------------------------------------
// Array validation
// ---------------------------------------------------------------------------

const validateArray = (
  value: unknown[],
  schema: JsonSchema,
  path: string,
  errors: JsonSchemaValidationError[]
): void => {
  if (schema.minItems !== undefined && value.length < schema.minItems) {
    errors.push({ path, message: `Array has ${value.length} items; minItems is ${schema.minItems}.` });
  }

  if (schema.maxItems !== undefined && value.length > schema.maxItems) {
    errors.push({ path, message: `Array has ${value.length} items; maxItems is ${schema.maxItems}.` });
  }

  if (schema.items !== undefined) {
    for (let i = 0; i < value.length; i++) {
      validateNode(value[i], schema.items, `${path}[${i}]`, errors);
    }
  }
};

// ---------------------------------------------------------------------------
// Object validation
// ---------------------------------------------------------------------------

const validateObject = (
  value: Record<string, unknown>,
  schema: JsonSchema,
  path: string,
  errors: JsonSchemaValidationError[]
): void => {
  // required
  if (schema.required !== undefined) {
    for (const key of schema.required) {
      if (!(key in value)) {
        errors.push({ path, message: `Required property '${key}' is missing.` });
      }
    }
  }

  // properties
  if (schema.properties !== undefined) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in value) {
        validateNode(value[key], propSchema, `${path}.${key}`, errors);
      }
    }
  }

  // additionalProperties
  if (schema.additionalProperties === false && schema.properties !== undefined) {
    const definedKeys = new Set(Object.keys(schema.properties));

    for (const key of Object.keys(value)) {
      if (!definedKeys.has(key)) {
        errors.push({ path: `${path}.${key}`, message: `Additional property '${key}' is not allowed.` });
      }
    }
  } else if (
    schema.additionalProperties !== undefined &&
    schema.additionalProperties !== true &&
    typeof schema.additionalProperties === "object" &&
    schema.properties !== undefined
  ) {
    const definedKeys = new Set(Object.keys(schema.properties));

    for (const key of Object.keys(value)) {
      if (!definedKeys.has(key)) {
        validateNode(value[key], schema.additionalProperties, `${path}.${key}`, errors);
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Deep equality helper (no external dependency)
// ---------------------------------------------------------------------------

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }

  if (a === null || b === null) {
    return false;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((item, index) => deepEqual(item, (b as unknown[])[index]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    return aKeys.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  return false;
};
