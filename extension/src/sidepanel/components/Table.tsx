/**
 * QA.Interceptor — Table Component
 *
 * Data table with sorting, sticky header and density modes.
 * Implements Phase FE-1 task: TAB-001 (Table)
 */

import React from "react";

export type TableDensity = "compact" | "spacious";
export type SortDirection = "asc" | "desc";

export interface TableColumn<RowData> {
  key: keyof RowData;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: RowData[keyof RowData], row: RowData) => React.ReactNode;
}

export interface TableProps<RowData extends Record<string, unknown>>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  columns: TableColumn<RowData>[];
  rows: RowData[];
  rowKey: (row: RowData, index: number) => string;
  density?: TableDensity;
  stickyHeader?: boolean;
  emptyMessage?: string;
  initialSort?: { key: keyof RowData; direction: SortDirection };
}

const compareValues = (a: unknown, b: unknown): number => {
  if (a === b) {
    return 0;
  }

  if (a === null || a === undefined) {
    return -1;
  }

  if (b === null || b === undefined) {
    return 1;
  }

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

export const Table = React.forwardRef(
  <RowData extends Record<string, unknown>>(
    {
      columns,
      rows,
      rowKey,
      density = "spacious",
      stickyHeader = true,
      emptyMessage = "No data available",
      initialSort,
      className = "",
      ...rest
    }: TableProps<RowData>,
    ref: React.Ref<HTMLDivElement>
  ) => {
    const [sortState, setSortState] = React.useState<
      { key: keyof RowData; direction: SortDirection } | undefined
    >(initialSort);

    const sortedRows = React.useMemo(() => {
      if (!sortState) {
        return rows;
      }

      return [...rows].sort((left, right) => {
        const result = compareValues(left[sortState.key], right[sortState.key]);
        return sortState.direction === "asc" ? result : -result;
      });
    }, [rows, sortState]);

    const toggleSort = (column: TableColumn<RowData>) => {
      if (!column.sortable) {
        return;
      }

      setSortState((current) => {
        if (!current || current.key !== column.key) {
          return { key: column.key, direction: "asc" };
        }

        if (current.direction === "asc") {
          return { key: column.key, direction: "desc" };
        }

        return undefined;
      });
    };

    const classes = [
      "table-wrap",
      `table-density-${density}`,
      stickyHeader ? "table-sticky-header" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div {...rest} ref={ref} className={classes}>
        <table className="table" role="table">
          <thead className="table-head">
            <tr>
              {columns.map((column) => {
                const sorted = sortState?.key === column.key ? sortState.direction : undefined;
                return (
                  <th
                    key={String(column.key)}
                    scope="col"
                    className={[
                      "table-header-cell",
                      column.sortable ? "table-header-cell-sortable" : "",
                      column.align ? `table-align-${column.align}` : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    <button
                      type="button"
                      className="table-header-button"
                      onClick={() => toggleSort(column)}
                      disabled={!column.sortable}
                      aria-label={column.sortable ? `Sort by ${column.label}` : undefined}
                    >
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className="table-sort-indicator" aria-hidden="true">
                          {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}
                        </span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="table-body">
            {sortedRows.length === 0 && (
              <tr>
                <td className="table-empty" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}

            {sortedRows.map((row, index) => (
              <tr key={rowKey(row, index)} className="table-row">
                {columns.map((column) => {
                  const value = row[column.key];

                  return (
                    <td
                      key={String(column.key)}
                      className={[
                        "table-cell",
                        column.align ? `table-align-${column.align}` : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {column.render ? column.render(value, row) : String(value ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

Table.displayName = "Table";