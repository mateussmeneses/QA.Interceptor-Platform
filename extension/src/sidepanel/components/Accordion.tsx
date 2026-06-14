/**
 * QA.Interceptor — Accordion Component
 *
 * Collapsible sections with keyboard navigation.
 * Implements Phase FE-1 task: DSP-005 (Accordion)
 */

import React from "react";

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: AccordionItem[];
  multiple?: boolean;
  openItemIds?: string[];
  defaultOpenItemIds?: string[];
  onChange?: (openItemIds: string[]) => void;
}

export const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      id: providedId,
      items,
      multiple = false,
      openItemIds,
      defaultOpenItemIds = [],
      onChange,
      className = "",
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const accordionId = providedId ?? generatedId;
    const isControlled = openItemIds !== undefined;
    const [internalOpenIds, setInternalOpenIds] = React.useState<string[]>(defaultOpenItemIds);
    const openIds = isControlled ? openItemIds : internalOpenIds;

    const enabledIds = items.filter((item) => !item.disabled).map((item) => item.id);

    const emitChange = (nextOpenIds: string[]) => {
      if (!isControlled) {
        setInternalOpenIds(nextOpenIds);
      }
      onChange?.(nextOpenIds);
    };

    const toggleItem = (itemId: string) => {
      const alreadyOpen = openIds.includes(itemId);

      if (alreadyOpen) {
        emitChange(openIds.filter((id) => id !== itemId));
        return;
      }

      if (multiple) {
        emitChange([...openIds, itemId]);
        return;
      }

      emitChange([itemId]);
    };

    const handleHeaderKeyDown = (
      event: React.KeyboardEvent<HTMLButtonElement>,
      currentId: string
    ) => {
      const currentIndex = enabledIds.indexOf(currentId);
      if (currentIndex < 0) {
        return;
      }

      let targetId: string | undefined;

      if (event.key === "ArrowDown") {
        targetId = enabledIds[(currentIndex + 1) % enabledIds.length];
      }

      if (event.key === "ArrowUp") {
        targetId = enabledIds[(currentIndex - 1 + enabledIds.length) % enabledIds.length];
      }

      if (event.key === "Home") {
        targetId = enabledIds[0];
      }

      if (event.key === "End") {
        targetId = enabledIds[enabledIds.length - 1];
      }

      if (!targetId) {
        return;
      }

      event.preventDefault();
      const targetButton = document.getElementById(`${accordionId}-trigger-${targetId}`);
      targetButton?.focus();
    };

    const classes = ["accordion", className].filter(Boolean).join(" ");

    return (
      <div {...rest} id={accordionId} className={classes} ref={ref}>
        {items.map((item) => {
          const expanded = openIds.includes(item.id);

          return (
            <section
              key={item.id}
              className={[
                "accordion-item",
                expanded ? "accordion-item-expanded" : "",
                item.disabled ? "accordion-item-disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <h3 className="accordion-header">
                <button
                  id={`${accordionId}-trigger-${item.id}`}
                  type="button"
                  className="accordion-trigger"
                  onClick={() => toggleItem(item.id)}
                  onKeyDown={(event) => handleHeaderKeyDown(event, item.id)}
                  disabled={item.disabled}
                  aria-expanded={expanded}
                  aria-controls={`${accordionId}-panel-${item.id}`}
                >
                  <span className="accordion-title">{item.title}</span>
                  <span className="accordion-chevron" aria-hidden="true">
                    ▾
                  </span>
                </button>
              </h3>

              <div
                id={`${accordionId}-panel-${item.id}`}
                role="region"
                aria-labelledby={`${accordionId}-trigger-${item.id}`}
                className="accordion-panel"
                hidden={!expanded}
              >
                <div className="accordion-content">{item.content}</div>
              </div>
            </section>
          );
        })}
      </div>
    );
  }
);

Accordion.displayName = "Accordion";