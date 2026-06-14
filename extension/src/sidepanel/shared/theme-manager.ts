/**
 * QA.Interceptor — Theme Manager
 *
 * Handles theme switching (light/dark/system) with localStorage persistence
 * and live system-preference detection. localStorage is used (not
 * chrome.storage) so the theme can be applied synchronously at boot, avoiding
 * a flash of the wrong theme.
 */

export type Theme = "light" | "dark";

/** User-facing preference. "system" follows the OS and keeps following it. */
export type ThemePreference = "light" | "dark" | "system";

/**
 * Pure resolver: maps a stored preference to the concrete theme to apply.
 * "system" defers to the OS preference (passed in for testability).
 */
export const resolveTheme = (preference: ThemePreference, prefersDark: boolean): Theme => {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }

  return preference;
};

interface ThemeConfig {
  storageKey: string;
  htmlElement: HTMLElement;
  themeAttribute: string;
}

class ThemeManager {
  private config: ThemeConfig;
  private currentTheme: Theme = "light";
  private preference: ThemePreference = "system";

  constructor(config: Partial<ThemeConfig> = {}) {
    this.config = {
      storageKey: "qa-interceptor-theme",
      htmlElement: document.documentElement,
      themeAttribute: "data-theme",
      ...config
    };

    this.init();
  }

  /**
   * Initialize theme on app startup
   * - Read the saved preference (light/dark/system)
   * - Resolve it against the system preference
   * - Apply and start following system changes
   */
  private init(): void {
    this.preference = this.getSavedPreference() ?? "system";
    this.applyResolvedTheme();
    this.listenToSystemThemeChanges();
  }

  /**
   * Get the saved preference from localStorage. Accepts the tri-state value;
   * legacy stored values of "light"/"dark" remain valid preferences.
   */
  private getSavedPreference(): ThemePreference | null {
    try {
      const saved = localStorage.getItem(this.config.storageKey);
      if (saved === "light" || saved === "dark" || saved === "system") {
        return saved;
      }
    } catch (error) {
      console.warn("Failed to read theme from localStorage:", error);
    }
    return null;
  }

  /**
   * Whether the OS currently prefers a dark color scheme.
   */
  private systemPrefersDark(): boolean {
    return Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  }

  /**
   * Listen to system theme changes and update if the preference is "system".
   */
  private listenToSystemThemeChanges(): void {
    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (this.preference === "system") {
        this.applyResolvedTheme();
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
  }

  /**
   * Resolve the current preference and apply the concrete theme to the DOM.
   */
  private applyResolvedTheme(): void {
    const theme = resolveTheme(this.preference, this.systemPrefersDark());
    this.currentTheme = theme;
    this.config.htmlElement.setAttribute(this.config.themeAttribute, theme);
  }

  /**
   * Persist the current preference to localStorage.
   */
  private savePreference(): void {
    try {
      localStorage.setItem(this.config.storageKey, this.preference);
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }
  }

  /**
   * Get the resolved (concrete) current theme.
   */
  public getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Get the user-facing preference (light/dark/system).
   */
  public getPreference(): ThemePreference {
    return this.preference;
  }

  /**
   * Toggle between light and dark themes (sets an explicit preference).
   */
  public toggleTheme(): Theme {
    this.setPreference(this.currentTheme === "light" ? "dark" : "light");
    return this.currentTheme;
  }

  /**
   * Set an explicit concrete theme (light/dark) as the preference.
   */
  public setTheme(theme: Theme): void {
    this.setPreference(theme);
  }

  /**
   * Set the preference (light/dark/system), persist it, apply and notify.
   */
  public setPreference(preference: ThemePreference): void {
    this.preference = preference;
    this.savePreference();
    this.applyResolvedTheme();
    this.notifyThemeChanged(this.currentTheme);
  }

  /**
   * Dispatch custom event when theme changes
   */
  private notifyThemeChanged(theme: Theme): void {
    const event = new CustomEvent("theme-changed", {
      detail: { theme },
      bubbles: true
    });
    this.config.htmlElement.dispatchEvent(event);
  }
}

/**
 * Singleton instance
 */
let instance: ThemeManager;

/**
 * Get or create theme manager instance
 */
export function getThemeManager(): ThemeManager {
  if (!instance) {
    instance = new ThemeManager();
  }
  return instance;
}

/**
 * Initialize theme manager (usually called once on app startup)
 */
export function initTheme(): ThemeManager {
  return getThemeManager();
}

/**
 * Get current resolved theme
 */
export function getCurrentTheme(): Theme {
  return getThemeManager().getCurrentTheme();
}

/**
 * Get the user-facing preference (light/dark/system)
 */
export function getThemePreference(): ThemePreference {
  return getThemeManager().getPreference();
}

/**
 * Toggle theme
 */
export function toggleTheme(): Theme {
  return getThemeManager().toggleTheme();
}

/**
 * Set theme explicitly (concrete light/dark)
 */
export function setTheme(theme: Theme): void {
  getThemeManager().setTheme(theme);
}

/**
 * Set the user-facing preference (light/dark/system)
 */
export function setThemePreference(preference: ThemePreference): void {
  getThemeManager().setPreference(preference);
}

/**
 * Wire a <select> control to the theme preference: reflects the current value
 * and updates the theme when the user changes it.
 */
export function wireThemeSelect(select: HTMLSelectElement): void {
  const manager = getThemeManager();
  select.value = manager.getPreference();
  select.addEventListener("change", () => {
    const value = select.value;
    if (value === "light" || value === "dark" || value === "system") {
      manager.setPreference(value);
    }
  });
}
