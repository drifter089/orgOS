import type { ComponentType, ReactElement, ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

import { CodeBlock } from "@/app/docs/_components/CodeBlock";
import { Button } from "@/components/ui/button";

import { MermaidDiagram } from "./src/app/docs/_components/MermaidDiagram";
import { Alert, AlertDescription, AlertTitle } from "./src/components/ui/alert";
import { Badge } from "./src/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./src/components/ui/card";

type MDXComponents = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ComponentType<any>
  | ReactElement
  | ((props: Record<string, unknown>) => ReactElement)
>;

export function useMDXComponents(
  components: MDXComponents = {},
): MDXComponents {
  return {
    // Custom heading styles with increased spacing
    h1: ({ children }: { children: ReactNode }) => (
      <h1 className="mt-4 mb-12 scroll-m-20 text-5xl leading-tight font-bold tracking-tight transition-colors duration-200">
        {children}
      </h1>
    ),
    h2: ({ children }: { children: ReactNode }) => (
      <h2 className="border-border/50 mt-20 mb-10 scroll-m-20 border-b pb-4 text-3xl leading-tight font-bold tracking-tight transition-colors duration-200 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }: { children: ReactNode }) => (
      <h3 className="mt-16 mb-8 scroll-m-20 text-2xl leading-snug font-semibold tracking-tight transition-colors duration-200">
        {children}
      </h3>
    ),
    h4: ({ children }: { children: ReactNode }) => (
      <h4 className="mt-12 mb-6 scroll-m-20 text-xl leading-snug font-semibold tracking-tight transition-colors duration-200">
        {children}
      </h4>
    ),

    // Custom paragraph with increased line height and spacing
    p: ({ children }: { children: ReactNode }) => (
      <p className="text-foreground/85 mb-10 text-base leading-loose transition-colors duration-200 [&:not(:first-child)]:mt-8">
        {children}
      </p>
    ),

    // Custom links with Next.js Link component
    a: ({ href, children }: { href?: string; children: ReactNode }) => {
      const isExternal = href?.startsWith("http");
      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary decoration-primary/30 hover:text-primary/80 hover:decoration-primary/60 font-medium underline underline-offset-4 transition-all duration-200"
          >
            {children}
          </a>
        );
      }
      return (
        <Link
          href={href ?? "#"}
          className="text-primary decoration-primary/30 hover:text-primary/80 hover:decoration-primary/60 font-medium underline underline-offset-4 transition-all duration-200"
        >
          {children}
        </Link>
      );
    },

    // Custom image with Next.js Image component
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const src = typeof props.src === "string" ? props.src : "";
      return (
        <div className="my-16">
          <Image
            src={src}
            alt={props.alt ?? ""}
            width={800}
            height={600}
            className="border-border/30 rounded-xl border-2 shadow-lg transition-all duration-300 hover:shadow-xl"
          />
        </div>
      );
    },

    // Horizontal rule with more spacing
    hr: () => <hr className="border-border/20 my-20 border-t-2" />,

    // Strong emphasis
    strong: ({ children }: { children: ReactNode }) => (
      <strong className="text-foreground font-semibold transition-colors duration-200">
        {children}
      </strong>
    ),

    // Emphasis
    em: ({ children }: { children: ReactNode }) => (
      <em className="text-foreground/85 italic transition-colors duration-200">
        {children}
      </em>
    ),

    // Custom code blocks with client-side syntax highlighting
    code: ({
      children,
      className,
    }: {
      children: ReactNode;
      className?: string;
    }) => (
      <CodeBlock className={className} inline={!className}>
        {children}
      </CodeBlock>
    ),

    // Custom pre for mermaid diagrams and code blocks
    pre: ({ children }: { children?: ReactNode }) => {
      // Check if the child code element has mermaid class
      const childProps = (
        children as { props?: { className?: string; children?: ReactNode } }
      )?.props;
      const codeClassName = childProps?.className ?? "";
      const isMermaid = codeClassName.includes("language-mermaid");

      if (isMermaid) {
        // Extract the chart content from the code element
        const childrenContent = childProps?.children;
        const chart =
          typeof childrenContent === "string" ? childrenContent.trim() : "";
        return <MermaidDiagram chart={chart} />;
      }

      // Pass through to code component for syntax highlighting
      return <>{children}</>;
    },

    // Custom blockquote with improved spacing
    blockquote: ({ children }: { children: ReactNode }) => (
      <blockquote className="border-primary/30 bg-muted/20 hover:bg-muted/30 my-12 border-l-4 py-6 pr-6 pl-8 leading-loose italic transition-all duration-200">
        {children}
      </blockquote>
    ),

    // Custom lists with generous spacing
    ul: ({ children }: { children: ReactNode }) => (
      <ul className="marker:text-muted-foreground/70 my-12 ml-8 list-disc space-y-5 [&>li]:pl-3 [&>li]:leading-loose">
        {children}
      </ul>
    ),
    ol: ({ children }: { children: ReactNode }) => (
      <ol className="marker:text-muted-foreground/70 my-12 ml-8 list-decimal space-y-5 [&>li]:pl-3 [&>li]:leading-loose">
        {children}
      </ol>
    ),
    li: ({ children }: { children: ReactNode }) => (
      <li className="text-foreground/85 transition-colors duration-200">
        {children}
      </li>
    ),

    // Custom table with improved spacing and readability
    table: ({ children }: { children: ReactNode }) => (
      <div className="border-border/30 bg-card my-16 w-full overflow-x-auto rounded-xl border shadow-md transition-shadow duration-300 hover:shadow-lg">
        <table className="w-full border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }: { children: ReactNode }) => (
      <thead className="bg-muted/40 border-border/50 border-b">
        {children}
      </thead>
    ),
    th: ({ children }: { children: ReactNode }) => (
      <th className="text-muted-foreground px-8 py-5 text-left text-sm font-semibold tracking-wider uppercase [&[align=center]]:text-center [&[align=right]]:text-right">
        {children}
      </th>
    ),
    td: ({ children }: { children: ReactNode }) => (
      <td className="border-border/20 text-foreground/85 border-b px-8 py-6 text-left leading-relaxed transition-colors duration-200 [&[align=center]]:text-center [&[align=right]]:text-right">
        {children}
      </td>
    ),

    // Expose shadcn components for use in MDX
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Alert,
    AlertTitle,
    AlertDescription,
    Badge,

    ...components,
  };
}
