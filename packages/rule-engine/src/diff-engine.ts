/**
 * Request/response text diff engine.
 * Produces a line-level diff between two text bodies (e.g. JSON responses).
 * Pure functions — no DOM, no chrome API, fully testable.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiffLineStatus = "equal" | "added" | "removed";

export type DiffLine = {
  status: DiffLineStatus;
  lineNumber: number;
  content: string;
};

export type DiffResult = {
  leftLines: DiffLine[];
  rightLines: DiffLine[];
  hasChanges: boolean;
  addedCount: number;
  removedCount: number;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Compute a line-level diff between two text strings.
 * Returns left (original) and right (modified) annotated line arrays.
 */
export const diffText = (left: string, right: string): DiffResult => {
  const leftLines = left.split("\n");
  const rightLines = right.split("\n");

  const lcs = computeLcs(leftLines, rightLines);
  return buildDiffResult(leftLines, rightLines, lcs);
};

// ---------------------------------------------------------------------------
// LCS (Longest Common Subsequence) via DP
// ---------------------------------------------------------------------------

const computeLcs = (a: string[], b: string[]): boolean[][] => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = (dp[i - 1]?.[j - 1] ?? 0) + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1]?.[j] ?? 0, dp[i]?.[j - 1] ?? 0);
      }
    }
  }

  // Trace back to build the match table
  const match: boolean[][] = Array.from({ length: m }, () => new Array<boolean>(n).fill(false));
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      match[i - 1][j - 1] = true;
      i--;
      j--;
    } else if ((dp[i - 1]?.[j] ?? 0) >= (dp[i]?.[j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }

  return match;
};

// ---------------------------------------------------------------------------
// Build diff result from LCS match table
// ---------------------------------------------------------------------------

const buildDiffResult = (
  leftLines: string[],
  rightLines: string[],
  match: boolean[][]
): DiffResult => {
  const leftResult: DiffLine[] = [];
  const rightResult: DiffLine[] = [];

  const m = leftLines.length;
  const n = rightLines.length;

  let li = 0;
  let ri = 0;
  let leftNum = 1;
  let rightNum = 1;

  while (li < m || ri < n) {
    const matched = li < m && ri < n && match[li]?.[ri] === true;

    if (matched) {
      const content = leftLines[li] ?? "";
      leftResult.push({ status: "equal", lineNumber: leftNum++, content });
      rightResult.push({ status: "equal", lineNumber: rightNum++, content });
      li++;
      ri++;
    } else {
      // Emit removed lines from left
      const nextMatchLeft = ri < n ? findNextMatchInLeft(li, ri, m, match) : m;
      const nextMatchRight = li < m ? findNextMatchInRight(li, ri, n, match) : n;

      if (nextMatchLeft <= nextMatchRight) {
        // Prefer consuming left (removed)
        if (li < m) {
          leftResult.push({
            status: "removed",
            lineNumber: leftNum++,
            content: leftLines[li] ?? ""
          });
          rightResult.push({ status: "removed", lineNumber: -1, content: "" });
          li++;
        } else {
          leftResult.push({ status: "added", lineNumber: -1, content: "" });
          rightResult.push({
            status: "added",
            lineNumber: rightNum++,
            content: rightLines[ri] ?? ""
          });
          ri++;
        }
      } else {
        // Prefer consuming right (added)
        if (ri < n) {
          leftResult.push({ status: "added", lineNumber: -1, content: "" });
          rightResult.push({
            status: "added",
            lineNumber: rightNum++,
            content: rightLines[ri] ?? ""
          });
          ri++;
        } else {
          leftResult.push({
            status: "removed",
            lineNumber: leftNum++,
            content: leftLines[li] ?? ""
          });
          rightResult.push({ status: "removed", lineNumber: -1, content: "" });
          li++;
        }
      }
    }
  }

  const addedCount = rightResult.filter((l) => l.status === "added").length;
  const removedCount = leftResult.filter((l) => l.status === "removed").length;

  return {
    leftLines: leftResult,
    rightLines: rightResult,
    hasChanges: addedCount > 0 || removedCount > 0,
    addedCount,
    removedCount
  };
};

const findNextMatchInLeft = (li: number, ri: number, m: number, match: boolean[][]): number => {
  for (let i = li; i < m; i++) {
    if (match[i]?.[ri] === true) {
      return i - li;
    }
  }

  return m - li;
};

const findNextMatchInRight = (li: number, ri: number, n: number, match: boolean[][]): number => {
  for (let j = ri; j < n; j++) {
    if (match[li]?.[j] === true) {
      return j - ri;
    }
  }

  return n - ri;
};

// ---------------------------------------------------------------------------
// Pretty-print JSON before diffing
// ---------------------------------------------------------------------------

/**
 * Attempt to parse text as JSON and pretty-print it.
 * Returns the original text on failure.
 */
export const normalizeDiffText = (text: string): string => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};
