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
  }

  setActiveView("rules");
}

export function setActiveView(view: ViewId): void {
  for (const button of navButtons) {
    button.classList.toggle("active", button.dataset.view === view);
  }

  for (const panel of viewPanels) {
    panel.classList.toggle("hidden", panel.dataset.panel !== view);
  }

  if (workspaceTitleEl) {
    workspaceTitleEl.textContent = VIEW_META[view].title;
  }

  if (workspaceSubtitleEl) {
    workspaceSubtitleEl.textContent = VIEW_META[view].subtitle;
  }
}
