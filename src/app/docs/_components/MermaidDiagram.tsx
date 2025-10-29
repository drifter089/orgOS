"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "next-themes";

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const { theme } = useTheme();

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        // Initialize mermaid with theme-aware settings
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          themeVariables: {
            primaryColor: theme === "dark" ? "#6366f1" : "#4f46e5",
            primaryTextColor: theme === "dark" ? "#fff" : "#000",
            primaryBorderColor: theme === "dark" ? "#4f46e5" : "#6366f1",
            lineColor: theme === "dark" ? "#6b7280" : "#9ca3af",
            secondaryColor: theme === "dark" ? "#1e293b" : "#f1f5f9",
            tertiaryColor: theme === "dark" ? "#0f172a" : "#e2e8f0",
          },
        });

        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
      } catch (error) {
        console.error("Failed to render mermaid diagram:", error);
        setSvg(`<pre class="text-destructive">Error rendering diagram: ${error}</pre>`);
      }
    };

    renderDiagram();
  }, [chart, theme]);

  return (
    <div
      ref={containerRef}
      className="my-10 flex justify-center overflow-x-auto rounded-xl border-2 border-border/50 bg-card p-6 shadow-sm"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
