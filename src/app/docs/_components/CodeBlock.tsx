"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

interface CodeBlockProps {
  children: ReactNode;
  className?: string;
  inline?: boolean;
}

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const { theme } = useTheme();

  // Extract language from className (format: language-js, language-typescript, etc.)
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "text";

  // Get code content as string
  const code = String(children).replace(/\n$/, "");

  // Inline code
  if (inline || !match) {
    return (
      <code className="relative rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[0.875em] font-medium border border-border/50">
        {children}
      </code>
    );
  }

  // Code block with syntax highlighting
  return (
    <div className="relative my-8 rounded-xl border-2 border-border/40 shadow-lg overflow-hidden group">
      {/* Language label */}
      {language && language !== "text" && (
        <div className="absolute top-0 right-4 z-10 px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-muted/90 text-muted-foreground rounded-b-md">
          {language}
        </div>
      )}

      <SyntaxHighlighter
        language={language}
        style={theme === "dark" ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: "1.5rem",
          fontSize: "0.875rem",
          lineHeight: "1.6",
          background: theme === "dark"
            ? "linear-gradient(to bottom, hsl(240 10% 3.9%), hsl(240 10% 3.5%))"
            : "linear-gradient(to bottom, hsl(240 4.8% 95.9%), hsl(240 5.9% 90%))",
        }}
        showLineNumbers={false}
        wrapLines={true}
        codeTagProps={{
          style: {
            fontFamily: "var(--font-geist-mono), 'Courier New', monospace",
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
