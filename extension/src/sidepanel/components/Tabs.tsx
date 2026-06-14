/**
 * QA.Interceptor — Tabs Component
 *
 * Tab navigation container with keyboard support.
 * Implements Phase FE-1 task: DSP-004 (Tabs)
 */

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  content?: React.ReactNode;
  disabled?: boolean;
  badge?: string;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: TabItem[];
  activeTabId?: string;
  defaultActiveTabId?: string;
  onChange?: (tabId: string) => void;
  orientation?: "horizontal" | "vertical";
  variant?: "line" | "pill";
  renderPanel?: (activeTab: TabItem | undefined) => React.ReactNode;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      id: providedId,
      items,
      activeTabId,
      defaultActiveTabId,
      onChange,
      orientation = "horizontal",
      variant = "line",
      renderPanel,
      className = "",
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const tabsId = providedId ?? generatedId;
    const isControlled = activeTabId !== undefined;
    const firstEnabledTab = items.find((item) => !item.disabled)?.id;
    const [internalTabId, setInternalTabId] = React.useState<string | undefined>(
      defaultActiveTabId ?? firstEnabledTab
    );
    const currentTabId = isControlled ? activeTabId : internalTabId;

    const activeTab = React.useMemo(
      () => items.find((item) => item.id === currentTabId && !item.disabled) ?? items.find((item) => !item.disabled),
      [currentTabId, items]
    );

    const activate = (tabId: string) => {
      const target = items.find((item) => item.id === tabId);
      if (!target || target.disabled) {
        return;
      }

      if (!isControlled) {
        setInternalTabId(tabId);
      }

      onChange?.(tabId);
    };

    const enabledIndices = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled)
      .map(({ index }) => index);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (enabledIndices.length === 0) {
        return;
      }

      const currentEnabledIndex = enabledIndices.indexOf(index);
      if (currentEnabledIndex < 0) {
        return;
      }

      const isHorizontal = orientation === "horizontal";
      let targetIndex: number | null = null;

      if ((isHorizontal && event.key === "ArrowRight") || (!isHorizontal && event.key === "ArrowDown")) {
        targetIndex = enabledIndices[(currentEnabledIndex + 1) % enabledIndices.length];
      }

      if ((isHorizontal && event.key === "ArrowLeft") || (!isHorizontal && event.key === "ArrowUp")) {
        targetIndex = enabledIndices[(currentEnabledIndex - 1 + enabledIndices.length) % enabledIndices.length];
      }

      if (event.key === "Home") {
        targetIndex = enabledIndices[0];
      }

      if (event.key === "End") {
        targetIndex = enabledIndices[enabledIndices.length - 1];
      }

      if (targetIndex === null) {
        return;
      }

      event.preventDefault();
      const target = items[targetIndex];
      if (!target) {
        return;
      }

      activate(target.id);

      const targetButton = document.getElementById(`${tabsId}-tab-${target.id}`);
      targetButton?.focus();
    };

    const classes = [
      "tabs",
      `tabs-${orientation}`,
      `tabs-${variant}`,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div {...rest} ref={ref} id={tabsId} className={classes}>
        <div
          className="tabs-list"
          role="tablist"
          aria-orientation={orientation}
        >
          {items.map((item, index) => {
            const isSelected = item.id === activeTab?.id;

            return (
              <button
                key={item.id}
                id={`${tabsId}-tab-${item.id}`}
                type="button"
                role="tab"
                className={[
                  "tabs-trigger",
                  isSelected ? "tabs-trigger-active" : "",
                  item.disabled ? "tabs-trigger-disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-selected={isSelected}
                aria-controls={`${tabsId}-panel-${item.id}`}
                tabIndex={isSelected ? 0 : -1}
                disabled={item.disabled}
                onClick={() => activate(item.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                <span>{item.label}</span>
                {item.badge && <span className="tabs-badge">{item.badge}</span>}
              </button>
            );
          })}
        </div>

        <div
          id={`${tabsId}-panel-${activeTab?.id ?? "empty"}`}
          role="tabpanel"
          className="tabs-panel"
          aria-labelledby={activeTab ? `${tabsId}-tab-${activeTab.id}` : undefined}
        >
          {renderPanel ? renderPanel(activeTab) : activeTab?.content}
        </div>
      </div>
    );
  }
);

Tabs.displayName = "Tabs";