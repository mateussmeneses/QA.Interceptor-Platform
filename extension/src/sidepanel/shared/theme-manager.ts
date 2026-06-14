/**
 * QA.Interceptor — Theme Manager
 * 
 * Handles light/dark mode theme switching with localStorage persistence
 * and system preference detection.
 */

export type Theme = "light" | "dark";

interface ThemeConfig {
  storageKey: string;
  htmlElement: HTMLElement;
  themeAttribute: string;
}

class ThemeManager {
  private config: ThemeConfig;
  private currentTheme: Theme = "light";

  constructor(config: Partial<ThemeConfig> = {}) {
    this.config = {
      storageKey: "qa-interceptor-theme",
      htmlElement: document.documentElement,
      themeAttribute: "data-theme",
      ...config,
    };

    this.init();
  }

  /**
   * Initialize theme on app startup
   * - Check localStorage for saved preference
   * - Fall back to system preference
   * - Fall back to light mode
   */
  private init(): void {
    const savedTheme = this.getSavedTheme();
    const systemTheme = this.getSystemTheme();
    const themeToApply = savedTheme || systemTheme || "light";

    this.applyTheme(themeToApply);
    this.listenToSystemThemeChanges();
  }

  /**
   * Get theme saved in localStorage
   */
  private getSavedTheme(): Theme | null {
    try {
      const saved = localStorage.getItem(this.config.storageKey);
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch (error) {
      console.warn("Failed to read theme from localStorage:", error);
    }
    return null;
  }

  /**
   * Get system theme preference
   */
  private getSystemTheme(): Theme {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  /**
   * Listen to system theme changes and update if no user preference is set
   */
  private listenToSystemThemeChanges(): void {
    if (!window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // Only update if user hasn't saved a preference
      if (!this.getSavedTheme()) {
        const newTheme = this.getSystemTheme();
        this.applyTheme(newTheme);
      }
    };

    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
  }

  /**
   * Apply theme to HTML element and save to localStorage
   */
  private applyTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.config.htmlElement.setAttribute(this.config.themeAttribute, theme);
    try {
      localStorage.setItem(this.config.storageKey, theme);
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }
  }

  /**
   * Get current theme
   */
  public getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Toggle between light and dark themes
   */
  public toggleTheme(): Theme {
    const newTheme = this.currentTheme === "light" ? "dark" : "light";
    this.applyTheme(newTheme);
    this.notifyThemeChanged(newTheme);
    return newTheme;
  }

  /**
   * Set specific theme
   */
  public setTheme(theme: Theme): void {
    if (theme === this.currentTheme) {
      return;
    }
    this.applyTheme(theme);
    this.notifyThemeChanged(theme);
  }

  /**
   * Dispatch custom event when theme changes
   */
  private notifyThemeChanged(theme: Theme): void {
    const event = new CustomEvent("theme-changed", {
      detail: { theme },
      bubbles: true,
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
 * Get current theme
 */
export function getCurrentTheme(): Theme {
  return getThemeManager().getCurrentTheme();
}

/**
 * Toggle theme
 */
export function toggleTheme(): Theme {
  return getThemeManager().toggleTheme();
}

/**
 * Set theme explicitly
 */
export function setTheme(theme: Theme): void {
  getThemeManager().setTheme(theme);
}
