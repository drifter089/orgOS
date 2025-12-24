"use client";

import { type ReactNode, useEffect, useState } from "react";

import { useTheme } from "next-themes";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  children: ReactNode;
  className?: string;
  inline?: boolean;
}

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract language from className (format: language-js, language-typescript, etc.)
  const match = /language-(\w+)/.exec(className ?? "");
  const language = match ? match[1] : "text";

  const code = typeof children === "string" ? children.replace(/\n$/, "") : "";

  // Inline code
  if (inline || !match) {
    return (
      <code className="bg-muted/80 border-border/50 relative rounded border px-1.5 py-0.5 font-mono text-[0.875em] font-medium">
        {children}
      </code>
    );
  }

  // Use light theme as default for SSR to prevent hydration mismatch
  const currentTheme = mounted ? theme : "light";
  const isDark = currentTheme === "dark";

  // Code block with syntax highlighting
  return (
    <div className="border-border/40 group relative my-8 overflow-hidden rounded-xl border-2 shadow-lg">
      {/* Language label */}
      {language && language !== "text" && (
        <div className="bg-muted/90 text-muted-foreground absolute top-0 right-4 z-10 rounded-b-md px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          {language}
        </div>
      )}

      <SyntaxHighlighter
        language={language}
        style={isDark ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: "1.5rem",
          fontSize: "0.875rem",
          lineHeight: "1.6",
          background: isDark
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
