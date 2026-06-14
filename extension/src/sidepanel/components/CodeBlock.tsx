/**
 * QA.Interceptor — Code Block Component
 *
 * Code display with copy action and optional line numbers.
 * Implements Phase FE-1 task: TAB-003 (Code block display)
 */

import React from "react";

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  onCopy?: (copiedText: string) => void;
}

export const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  (
    {
      code,
      language = "text",
      title,
      showLineNumbers = false,
      maxHeight = "320px",
      onCopy,
      className = "",
      ...rest
    },
    ref
  ) => {
    const [copied, setCopied] = React.useState(false);
    const lines = React.useMemo(() => code.split(/\r?\n/), [code]);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        onCopy?.(code);
        window.setTimeout(() => setCopied(false), 1200);
      } catch {
        setCopied(false);
      }
    };

    const classes = ["code-block", className].filter(Boolean).join(" ");

    return (
      <div {...rest} ref={ref} className={classes}>
        <div className="code-block-header">
          <div className="code-block-meta">
            {title && <span className="code-block-title">{title}</span>}
            <span className="code-block-language">{language}</span>
          </div>
          <button type="button" className="code-block-copy-btn" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="code-block-body" style={{ maxHeight }}>
          {showLineNumbers ? (
            <table className="code-block-table" role="presentation">
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="code-block-line-number">{index + 1}</td>
                    <td className="code-block-line-content">
                      <code className={`language-${language}`}>{line || " "}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="code-block-pre">
              <code className={`language-${language}`}>{code}</code>
            </pre>
          )}
        </div>
      </div>
    );
  }
);

CodeBlock.displayName = "CodeBlock";