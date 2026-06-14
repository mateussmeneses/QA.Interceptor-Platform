/**
 * Navigation feature module.
 * Manages the active view and workspace header text.
 */

import type { ViewId } from "../shared/types";
import { isViewId } from "../shared/types";

type ViewMeta = { title: string; subtitle: string };

const VIEW_META: Record<ViewId, ViewMeta> = {
  rules: {
    title: "Rules Workspace",
    subtitle: "Requestly-inspired shell with live data widgets.",
  },
  network: {
    title: "Network Inspector",
    subtitle: "Traffic table, status chips, and request detail timeline.",
  },
  mocks: {
    title: "Mock Playground",
    subtitle: "Mock payload and status authoring with QA scenario hints.",
  },
  history: {
    title: "History & Evidence",
    subtitle: "Session list, evidence timeline, and export-ready QA snapshot.",
  },
  settings: {
    title: "Settings",
    subtitle: "Preferences, diagnostics, and QA error simulation profiles.",
  },
};

let navButtons: HTMLButtonElement[] = [];
let viewPanels: HTMLElement[] = [];
let workspaceTitleEl: HTMLElement | null = null;
let workspaceSubtitleEl: HTMLElement | null = null;
let activeView: ViewId = "rules";
const viewChangeListeners: Array<(view: ViewId) => void> = [];

const getButtonView = (button: HTMLButtonElement): ViewId | null => {
  const view = button.dataset.view;
  return isViewId(view) ? view : null;
};

const focusNavButton = (index: number): void => {
  const button = navButtons[index];

  if (!button) {
    return;
  }

  button.focus();

  const view = getButtonView(button);
  if (view) {
    setActiveView(view);
  }
};

export function initNavigation(): void {
  navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".nav-item[data-view]"));
  viewPanels = Array.from(document.querySelectorAll<HTMLElement>(".view-panel[data-panel]"));
  workspaceTitleEl = document.getElementById("workspace-title");
  workspaceSubtitleEl = document.getElementById("workspace-subtitle");

  for (const button of navButtons) {
    button.addEventListener("click", () => {
      const view = button.dataset.view;

      if (isViewId(view)) {
        setActiveView(view);
      }
    });

    button.addEventListener("keydown", (event) => {
      const currentIndex = navButtons.findIndex((candidate) => candidate === button);

      if (currentIndex < 0) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % navButtons.length;
        focusNavButton(nextIndex);
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + navButtons.length) % navButtons.length;
        focusNavButton(prevIndex);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusNavButton(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        focusNavButton(navButtons.length - 1);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const view = getButtonView(button);

        if (view) {
          setActiveView(view);
        }
      }
    });
  }

  setActiveView(activeView);
}

export function getActiveView(): ViewId {
  return activeView;
}

export function onActiveViewChange(listener: (view: ViewId) => void): () => void {
  viewChangeListeners.push(listener);

  return () => {
    const index = viewChangeListeners.indexOf(listener);

    if (index >= 0) {
      viewChangeListeners.splice(index, 1);
    }
  };
}

export function setActiveView(view: ViewId): void {
  const changed = activeView !== view;
  activeView = view;

  for (const button of navButtons) {
    const isActive = button.dataset.view === view;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.setAttribute("tabindex", isActive ? "0" : "-1");
  }

  for (const panel of viewPanels) {
    const isActive = panel.dataset.panel === view;
    panel.classList.toggle("hidden", !isActive);
    panel.setAttribute("aria-hidden", String(!isActive));

    if (!isActive) {
      panel.setAttribute("hidden", "true");
    } else {
      panel.removeAttribute("hidden");
    }
  }

  if (workspaceTitleEl) {
    workspaceTitleEl.textContent = VIEW_META[view].title;
  }

  if (workspaceSubtitleEl) {
    workspaceSubtitleEl.textContent = VIEW_META[view].subtitle;
  }

  if (changed) {
    for (const listener of viewChangeListeners) {
      listener(view);
    }
  }
}
