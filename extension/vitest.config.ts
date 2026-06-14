import { defineConfig } from "vitest/config";

/**
 * Vitest config for the extension's pure, framework-free logic (QA-TEST-001).
 *
 * Scope: only pure helper functions (no chrome API, no real DOM) are tested
 * here — primarily `src/sidepanel/shared/utils.ts`. DOM-imperative feature
 * modules are validated by build + full typecheck, not unit tests.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
