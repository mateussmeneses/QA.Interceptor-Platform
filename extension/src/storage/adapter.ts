/**
 * Storage adapter interface.
 *
 * Decouples feature modules from the chrome.storage API, enabling
 * the same feature code to run in:
 *   - Browser extension  → ChromeStorageAdapter
 *   - Electron desktop   → ElectronStorageAdapter (Phase 4)
 *   - Unit tests         → MemoryStorageAdapter
 *   - CI/CD              → MemoryStorageAdapter
 *
 * Architectural contract (ADR-002, Phase 4 extension):
 *   - All storage operations go through this interface.
 *   - Adapters are injected; never instantiated by feature modules.
 *   - The chrome.storage adapter is the default for the extension.
 *   - The memory adapter is provided for testing without chrome globals.
 *
 * Usage:
 *   // Extension (default):
 *   import { createChromeStorageAdapter } from "./storage/chrome-adapter";
 *
 *   // Tests:
 *   import { createMemoryStorageAdapter } from "./storage/memory-adapter";
 *
 *   // Electron (Phase 4):
 *   import { createElectronStorageAdapter } from "./storage/electron-adapter";
 */

// ---------------------------------------------------------------------------
// Core interface
// ---------------------------------------------------------------------------

/**
 * All storage adapters implement this interface.
 * Shape mirrors chrome.storage.local for minimal impedance mismatch.
 */
export interface StorageAdapter {
  /**
   * Read one or more keys. Missing keys return undefined in the map.
   */
  get(keys: string[]): Promise<Record<string, unknown>>;

  /**
   * Write one or more key-value pairs. Merges with existing storage.
   */
  set(items: Record<string, unknown>): Promise<void>;

  /**
   * Remove one or more keys.
   */
  remove(keys: string[]): Promise<void>;

  /**
   * Remove all stored data.
   */
  clear(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Chrome storage adapter (browser extension)
// ---------------------------------------------------------------------------

/**
 * Production adapter for Manifest V3 browser extensions.
 * Wraps chrome.storage.local in the StorageAdapter interface.
 * Only import this in extension context — chrome is not available in Node.js.
 */
export const createChromeStorageAdapter = (): StorageAdapter => ({
  get: (keys) =>
    new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result as Record<string, unknown>);
      });
    }),

  set: (items) =>
    new Promise((resolve) => {
      chrome.storage.local.set(items, () => {
        resolve();
      });
    }),

  remove: (keys) =>
    new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => {
        resolve();
      });
    }),

  clear: () =>
    new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    }),
});

// ---------------------------------------------------------------------------
// Memory storage adapter (tests, Node.js, Electron prototype)
// ---------------------------------------------------------------------------

/**
 * In-memory adapter for unit tests and Node.js environments.
 * No external dependencies. Fully synchronous under the hood.
 */
export const createMemoryStorageAdapter = (
  initialData: Record<string, unknown> = {}
): StorageAdapter & {
  /** Inspect current stored data (test helper). */
  snapshot(): Record<string, unknown>;
} => {
  const store: Record<string, unknown> = { ...initialData };

  return {
    get: (keys) =>
      Promise.resolve(
        Object.fromEntries(
          keys
            .filter((k) => k in store)
            .map((k) => [k, store[k]])
        )
      ),

    set: (items) => {
      Object.assign(store, items);
      return Promise.resolve();
    },

    remove: (keys) => {
      for (const key of keys) {
        delete store[key];
      }

      return Promise.resolve();
    },

    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }

      return Promise.resolve();
    },

    snapshot: () => ({ ...store }),
  };
};
