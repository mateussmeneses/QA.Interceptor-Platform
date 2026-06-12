/**
 * Contract snapshot comparison (QP-003).
 * Compares a current response against a stored snapshot to detect structural drift.
 * No external dependencies — pure structural diff, no deep value comparison.
 */

export type SnapshotDiffEntry = {
  path: string;
  type: "missing-key" | "extra-key" | "type-change" | "null-change";
  expected: string;
  actual: string;
};

export type SnapshotComparisonResult =
  | { match: true }
  | { match: false; diffs: SnapshotDiffEntry[] };

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Compares two JSON values structurally.
 * Only reports structural differences (keys and types), not value differences.
 * This allows QA engineers to detect breaking API contract changes without
 * being sensitive to changing values (IDs, timestamps, counts, etc.).
 */
export const compareContracts = (
  expected: unknown,
  actual: unknown
): SnapshotComparisonResult => {
  const diffs: SnapshotDiffEntry[] = [];
  diffNodes(expected, actual, "$", diffs);

  if (diffs.length === 0) {
    return { match: true };
  }

  return { match: false, diffs };
};

/**
 * Convenience: parse JSON strings then compare.
 */
export const compareContractStrings = (
  expectedJson: string,
  actualJson: string
): SnapshotComparisonResult => {
  let expectedParsed: unknown;
  let actualParsed: unknown;

  try {
    expectedParsed = JSON.parse(expectedJson);
  } catch {
    return {
      match: false,
      diffs: [{ path: "$", type: "type-change", expected: "valid JSON", actual: "parse error" }],
    };
  }

  try {
    actualParsed = JSON.parse(actualJson);
  } catch {
    return {
      match: false,
      diffs: [{ path: "$", type: "type-change", expected: "valid JSON", actual: "parse error in actual" }],
    };
  }

  return compareContracts(expectedParsed, actualParsed);
};

// ---------------------------------------------------------------------------
// Core diff logic
// ---------------------------------------------------------------------------

const diffNodes = (
  expected: unknown,
  actual: unknown,
  path: string,
  diffs: SnapshotDiffEntry[]
): void => {
  const expectedType = getStructuralType(expected);
  const actualType = getStructuralType(actual);

  // Null transitions
  if (expected === null && actual !== null) {
    diffs.push({ path, type: "null-change", expected: "null", actual: actualType });
    return;
  }

  if (expected !== null && actual === null) {
    diffs.push({ path, type: "null-change", expected: expectedType, actual: "null" });
    return;
  }

  // Type changed
  if (expectedType !== actualType) {
    diffs.push({ path, type: "type-change", expected: expectedType, actual: actualType });
    return;
  }

  // Recurse into objects
  if (expectedType === "object" && actualType === "object") {
    const expectedObj = expected as Record<string, unknown>;
    const actualObj = actual as Record<string, unknown>;

    // Keys in expected but not in actual
    for (const key of Object.keys(expectedObj)) {
      if (!(key in actualObj)) {
        diffs.push({
          path: `${path}.${key}`,
          type: "missing-key",
          expected: getStructuralType(expectedObj[key]),
          actual: "undefined",
        });
      } else {
        diffNodes(expectedObj[key], actualObj[key], `${path}.${key}`, diffs);
      }
    }

    // Keys in actual but not in expected
    for (const key of Object.keys(actualObj)) {
      if (!(key in expectedObj)) {
        diffs.push({
          path: `${path}.${key}`,
          type: "extra-key",
          expected: "undefined",
          actual: getStructuralType(actualObj[key]),
        });
      }
    }

    return;
  }

  // Recurse into arrays — compare first element schemas if available
  if (expectedType === "array" && actualType === "array") {
    const expectedArr = expected as unknown[];
    const actualArr = actual as unknown[];

    if (expectedArr.length > 0 && actualArr.length > 0) {
      // Compare first element of each array as a schema sample
      diffNodes(expectedArr[0], actualArr[0], `${path}[0]`, diffs);
    } else if (expectedArr.length > 0 && actualArr.length === 0) {
      diffs.push({
        path: `${path}[0]`,
        type: "missing-key",
        expected: getStructuralType(expectedArr[0]),
        actual: "empty array",
      });
    }
    // If expected is empty but actual has items, that's not a breaking change
  }
  // Primitive types that already match type — no structural diff
};

// ---------------------------------------------------------------------------
// Structural type classification
// ---------------------------------------------------------------------------

const getStructuralType = (value: unknown): string => {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
};
