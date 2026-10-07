#!/usr/bin/env node
/**
 * Internal markdown link checker (QA-DOC-002).
 *
 * Scans all tracked .md files for inline links `[text](target)` and verifies
 * that local (relative) link targets resolve to an existing file. External
 * links (http/https/mailto), anchors (#...), and absolute URLs are ignored.
 *
 * Zero dependencies — pure Node.js. Exits non-zero when broken links exist.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "coverage", "_archive"]);
const LINK_RE = /\[(?:[^\]]*)\]\(([^)]+)\)/g;

/** Recursively collect .md files, skipping ignored directories. */
const collectMarkdown = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collectMarkdown(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
};

const isExternal = (target) =>
  /^(https?:|mailto:|tel:|#|data:)/i.test(target) || target.startsWith("//");

const broken = [];
const files = collectMarkdown(repoRoot);

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const dir = path.dirname(file);

  for (const match of content.matchAll(LINK_RE)) {
    let target = match[1].trim();
    if (!target || isExternal(target)) continue;

    // Strip anchor and query fragments: file.md#section -> file.md
    target = target.split("#")[0].split("?")[0];
    if (!target) continue;

    // Decode %20 etc. for filesystem lookup.
    let decoded;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      decoded = target;
    }

    const resolved = path.resolve(dir, decoded);
    if (!existsSync(resolved)) {
      broken.push({
        file: path.relative(repoRoot, file),
        target: match[1].trim()
      });
    }
  }
}

if (broken.length > 0) {
  console.error(`✖ ${broken.length} broken internal markdown link(s):\n`);
  for (const b of broken) {
    console.error(`  ${b.file} → ${b.target}`);
  }
  process.exit(1);
}

console.log(`✓ All internal markdown links resolve (${files.length} files checked).`);
