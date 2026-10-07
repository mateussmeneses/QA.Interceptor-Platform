#!/usr/bin/env node
/**
 * Workspace link guard.
 *
 * In this npm-workspaces monorepo, the internal packages are consumed by name
 * (`@qa-interceptor/shared-types`, `@qa-interceptor/rule-engine`) and resolved
 * through symlinks under `node_modules/@qa-interceptor/*`. Those symlinks are
 * created by `npm install` and point at the package folders inside THIS repo.
 *
 * If the repository is moved, renamed, or cloned to a new path and the symlinks
 * are not refreshed, they keep pointing at the OLD absolute path. The build then
 * fails with a confusing `TS2307: Cannot find module '@qa-interceptor/...'`,
 * even though the source is fine.
 *
 * This guard runs before the build and turns that confusing failure into a
 * one-line fix: "run npm install". Zero dependencies — pure Node.js.
 */

import { realpathSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Internal packages that must be linked under node_modules/@qa-interceptor. */
const WORKSPACE_PACKAGES = [
  { name: "@qa-interceptor/shared-types", dir: "packages/shared-types" },
  { name: "@qa-interceptor/rule-engine", dir: "packages/rule-engine" },
  { name: "@qa-interceptor/extension", dir: "extension" }
];

const problems = [];

for (const pkg of WORKSPACE_PACKAGES) {
  const linkPath = path.join(repoRoot, "node_modules", pkg.name);
  const expected = path.join(repoRoot, pkg.dir);

  if (!existsSync(linkPath)) {
    problems.push(`  - ${pkg.name}: not linked in node_modules (missing).`);
    continue;
  }

  // Resolve the link target and compare against the real package folder in this repo.
  let actual;
  try {
    actual = realpathSync(linkPath);
  } catch {
    problems.push(`  - ${pkg.name}: link exists but its target is unresolvable (stale).`);
    continue;
  }

  const expectedReal = realpathSync(expected);
  if (path.resolve(actual) !== path.resolve(expectedReal)) {
    problems.push(
      `  - ${pkg.name}: points to\n      ${actual}\n    but should point to\n      ${expectedReal}`
    );
  }
}

if (problems.length > 0) {
  console.error("\n✖ Workspace package links are stale or missing.\n");
  console.error(problems.join("\n"));
  console.error(
    "\nThis usually happens after the repo is moved, renamed, or freshly cloned.\n" +
      "Fix it by reinstalling so npm recreates the workspace links:\n\n" +
      "    npm install\n"
  );
  process.exit(1);
}

console.log("✓ Workspace package links are healthy.");
