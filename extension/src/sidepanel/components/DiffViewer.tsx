/**
 * QA.Interceptor — Diff Viewer Component
 *
 * Side-by-side line comparison with synchronized scrolling.
 * Implements Phase FE-1 task: TAB-004 (Diff viewer)
 */

import React from "react";

type DiffLineKind = "added" | "removed" | "unchanged";

interface DiffLine {
  left: string;
  right: string;
  kind: DiffLineKind;
}

export interface DiffViewerProps extends React.HTMLAttributes<HTMLDivElement> {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
}

const buildLineDiff = (before: string, after: string): DiffLine[] => {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const total = Math.max(beforeLines.length, afterLines.length);

  const result: DiffLine[] = [];

  for (let index = 0; index < total; index += 1) {
    const left = beforeLines[index] ?? "";
    const right = afterLines[index] ?? "";

    if (left === right) {
      result.push({ left, right, kind: "unchanged" });
      continue;
    }

    if (!left && right) {
      result.push({ left: "", right, kind: "added" });
      continue;
    }

    if (left && !right) {
      result.push({ left, right: "", kind: "removed" });
      continue;
    }

    result.push({ left, right, kind: "removed" });
    result.push({ left: "", right, kind: "added" });
  }

  return result;
};

export const DiffViewer = React.forwardRef<HTMLDivElement, DiffViewerProps>(
  (
    {
      before,
      after,
      beforeLabel = "Before",
      afterLabel = "After",
      showLineNumbers = true,
      maxHeight = "380px",
      className = "",
      ...rest
    },
    ref
  ) => {
    const leftRef = React.useRef<HTMLDivElement>(null);
    const rightRef = React.useRef<HTMLDivElement>(null);
    const syncingRef = React.useRef<"left" | "right" | null>(null);
    const lines = React.useMemo(() => buildLineDiff(before, after), [before, after]);

    const syncScroll = (source: "left" | "right") => {
      const sourceRef = source === "left" ? leftRef.current : rightRef.current;
      const targetRef = source === "left" ? rightRef.current : leftRef.current;

      if (!sourceRef || !targetRef) {
        return;
      }

      if (syncingRef.current && syncingRef.current !== source) {
        return;
      }

      syncingRef.current = source;
      targetRef.scrollTop = sourceRef.scrollTop;

      window.requestAnimationFrame(() => {
        syncingRef.current = null;
      });
    };

    const classes = ["diff-viewer", className].filter(Boolean).join(" ");

    return (
      <div {...rest} ref={ref} className={classes}>
        <div className="diff-viewer-header">
          <div className="diff-viewer-title">{beforeLabel}</div>
          <div className="diff-viewer-title">{afterLabel}</div>
        </div>

        <div className="diff-viewer-body">
          <div
            ref={leftRef}
            className="diff-viewer-pane"
            style={{ maxHeight }}
            onScroll={() => syncScroll("left")}
          >
            {lines.map((line, index) => (
              <div key={`left-${index}`} className={`diff-line diff-line-${line.kind}`}>
                {showLineNumbers && <span className="diff-line-number">{index + 1}</span>}
                <code className="diff-line-code">{line.left || " "}</code>
              </div>
            ))}
          </div>

          <div
            ref={rightRef}
            className="diff-viewer-pane"
            style={{ maxHeight }}
            onScroll={() => syncScroll("right")}
          >
            {lines.map((line, index) => (
              <div key={`right-${index}`} className={`diff-line diff-line-${line.kind}`}>
                {showLineNumbers && <span className="diff-line-number">{index + 1}</span>}
                <code className="diff-line-code">{line.right || " "}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

DiffViewer.displayName = "DiffViewer";