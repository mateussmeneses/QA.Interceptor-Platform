/**
 * Shared modal controller for sidepanel overlays.
 * Ensures consistent open/close behavior, focus trap, and focus restore.
 */

export interface ModalController {
  open: (options?: { restoreFocusEl?: HTMLElement | null }) => void;
  close: (options?: { restoreFocus?: boolean }) => void;
}

interface CreateModalControllerOptions {
  panelEl: HTMLElement;
  dialogEl: HTMLElement;
  onRequestClose: () => void;
  initialFocusEl?: () => HTMLElement | null;
  defaultRestoreFocusEl?: () => HTMLElement | null;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

const isVisible = (element: HTMLElement): boolean => {
  return element.offsetParent !== null && !element.hasAttribute("hidden");
};

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
};

let openModalCount = 0;
let previousBodyOverflow = "";

export const createModalController = ({
  panelEl,
  dialogEl,
  onRequestClose,
  initialFocusEl,
  defaultRestoreFocusEl
}: CreateModalControllerOptions): ModalController => {
  let restoreFocusEl: HTMLElement | null = null;
  let isOpen = false;

  panelEl.addEventListener("mousedown", (event) => {
    if (event.target === panelEl) {
      onRequestClose();
    }
  });

  panelEl.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onRequestClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements(dialogEl);

    if (focusable.length === 0) {
      event.preventDefault();
      dialogEl.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  return {
    open: (options) => {
      if (!isOpen) {
        if (openModalCount === 0) {
          previousBodyOverflow = document.body.style.overflow;
          document.body.style.overflow = "hidden";
        }

        openModalCount += 1;
      }

      panelEl.classList.remove("hidden");
      panelEl.setAttribute("aria-hidden", "false");
      isOpen = true;

      restoreFocusEl =
        options?.restoreFocusEl ??
        (document.activeElement as HTMLElement | null) ??
        defaultRestoreFocusEl?.() ??
        null;

      dialogEl.focus();

      const focusTarget = initialFocusEl?.() ?? getFocusableElements(dialogEl)[0] ?? dialogEl;
      focusTarget.focus();
    },
    close: (options) => {
      if (isOpen) {
        openModalCount = Math.max(0, openModalCount - 1);

        if (openModalCount === 0) {
          document.body.style.overflow = previousBodyOverflow;
        }
      }

      panelEl.classList.add("hidden");
      panelEl.setAttribute("aria-hidden", "true");
      isOpen = false;

      if (options?.restoreFocus === false) {
        return;
      }

      const fallback = defaultRestoreFocusEl?.() ?? null;
      const target = restoreFocusEl ?? fallback;
      target?.focus();
    }
  };
};
