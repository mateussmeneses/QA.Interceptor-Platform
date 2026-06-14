/**
 * QA.Interceptor — Popover Component
 *
 * Lightweight contextual surface with auto-flip positioning.
 * Implements Phase FE-1 task: MOD-004 (Popover/tooltip)
 */

import React from "react";

export type PopoverVariant = "light" | "dark";
export type PopoverPlacement = "top" | "bottom";

export interface PopoverProps extends React.HTMLAttributes<HTMLDivElement> {
  trigger: React.ReactNode;
  content: React.ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  variant?: PopoverVariant;
  placement?: PopoverPlacement;
}

export const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(
  (
    {
      trigger,
      content,
      isOpen,
      defaultOpen = false,
      onOpenChange,
      variant = "light",
      placement = "bottom",
      className = "",
      ...rest
    },
    ref
  ) => {
    const isControlled = isOpen !== undefined;
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const [resolvedPlacement, setResolvedPlacement] = React.useState<PopoverPlacement>(placement);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const panelRef = React.useRef<HTMLDivElement>(null);
    const open = isControlled ? isOpen : internalOpen;

    const setOpen = (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    };

    React.useEffect(() => {
      if (!open) {
        return;
      }

      const onOutsidePointer = (event: MouseEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) {
          setOpen(false);
        }
      };

      const onEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false);
          triggerRef.current?.focus();
        }
      };

      document.addEventListener("mousedown", onOutsidePointer);
      document.addEventListener("keydown", onEscape);

      return () => {
        document.removeEventListener("mousedown", onOutsidePointer);
        document.removeEventListener("keydown", onEscape);
      };
    }, [open]);

    React.useEffect(() => {
      if (!open || !triggerRef.current || !panelRef.current) {
        return;
      }

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      if (placement === "bottom" && spaceBelow < panelRect.height + 12 && spaceAbove > panelRect.height + 12) {
        setResolvedPlacement("top");
        return;
      }

      if (placement === "top" && spaceAbove < panelRect.height + 12 && spaceBelow > panelRect.height + 12) {
        setResolvedPlacement("bottom");
        return;
      }

      setResolvedPlacement(placement);
    }, [open, placement]);

    const classes = [
      "popover",
      `popover-${variant}`,
      `popover-${resolvedPlacement}`,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div {...rest} ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }} className={classes}>
        <button
          type="button"
          className="popover-trigger"
          ref={triggerRef}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          {trigger}
        </button>

        {open && (
          <div ref={panelRef} className="popover-panel" role="dialog">
            <div className="popover-arrow" aria-hidden="true" />
            <div className="popover-content">{content}</div>
          </div>
        )}
      </div>
    );
  }
);

Popover.displayName = "Popover";