/**
 * QA.Interceptor — List Item Component
 *
 * Reusable row with avatar/icon, content and actions.
 * Implements Phase FE-1 task: TAB-002 (List item)
 */

import React from "react";

export interface ListItemAction {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  avatar?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: ListItemAction[];
  isSelected?: boolean;
  isClickable?: boolean;
}

export const ListItem = React.forwardRef<HTMLDivElement, ListItemProps>(
  (
    {
      title,
      description,
      avatar,
      meta,
      actions = [],
      isSelected = false,
      isClickable = false,
      className = "",
      ...rest
    },
    ref
  ) => {
    const classes = [
      "list-item",
      isSelected ? "list-item-selected" : "",
      isClickable ? "list-item-clickable" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div {...rest} ref={ref} className={classes}>
        {avatar && <div className="list-item-avatar">{avatar}</div>}

        <div className="list-item-content">
          <div className="list-item-title-row">
            <div className="list-item-title">{title}</div>
            {meta && <div className="list-item-meta">{meta}</div>}
          </div>
          {description && <div className="list-item-description">{description}</div>}
        </div>

        {actions.length > 0 && (
          <div className="list-item-actions">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="list-item-action-btn"
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

ListItem.displayName = "ListItem";