import Image, { type ImageProps } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./src/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "./src/components/ui/alert";
import { Badge } from "./src/components/ui/badge";
import { CodeBlock } from "@/app/docs/_components/CodeBlock";
import { MermaidDiagram } from "./src/app/docs/_components/MermaidDiagram";

type MDXComponents = {
  [key: string]: React.ComponentType<any> | React.ReactElement | any;
};

export function useMDXComponents(
  components: MDXComponents = {},
): MDXComponents {
  return {
    // Custom heading styles
    h1: ({ children }: { children: ReactNode }) => (
      <h1 className="mt-2 mb-8 scroll-m-20 text-5xl leading-tight font-bold tracking-tight">
        {children}
      </h1>
    ),
    h2: ({ children }: { children: ReactNode }) => (
      <h2 className="mt-16 mb-6 scroll-m-20 border-b pb-3 text-3xl leading-tight font-bold tracking-tight first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }: { children: ReactNode }) => (
      <h3 className="mt-12 mb-5 scroll-m-20 text-2xl leading-snug font-semibold tracking-tight">
        {children}
      </h3>
    ),
    h4: ({ children }: { children: ReactNode }) => (
      <h4 className="mt-8 mb-4 scroll-m-20 text-xl leading-snug font-semibold tracking-tight">
        {children}
      </h4>
    ),

    // Custom paragraph
    p: ({ children }: { children: ReactNode }) => (
      <p className="text-foreground/90 mb-6 text-base leading-relaxed [&:not(:first-child)]:mt-4">
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
            className="text-primary decoration-primary/30 hover:text-primary/80 hover:decoration-primary/60 font-medium underline underline-offset-4 transition-colors"
          >
            {children}
          </a>
        );
      }
      return (
        <Link
          href={href ?? "#"}
          className="text-primary decoration-primary/30 hover:text-primary/80 hover:decoration-primary/60 font-medium underline underline-offset-4 transition-colors"
        >
          {children}
        </Link>
      );
    },

    // Custom image with Next.js Image component
    img: (props: any) => (
      <div className="my-10">
        <Image
          {...(props as ImageProps)}
          alt={props.alt ?? ""}
          width={800}
          height={600}
          className="border-border/50 rounded-xl border-2 shadow-md"
        />
      </div>
    ),

    // Horizontal rule
    hr: () => <hr className="border-border/30 my-12 border-t-2" />,

    // Strong emphasis
    strong: ({ children }: { children: ReactNode }) => (
      <strong className="text-foreground font-semibold">{children}</strong>
    ),

    // Emphasis
    em: ({ children }: { children: ReactNode }) => (
      <em className="text-foreground/90 italic">{children}</em>
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
    pre: ({ children, className, ...props }: any) => {
      // Check if the child code element has mermaid class
      const childProps = children?.props;
      const codeClassName = childProps?.className || "";
      const isMermaid = codeClassName.includes("language-mermaid");

      if (isMermaid) {
        // Extract the chart content from the code element
        const chart = String(childProps?.children || "").trim();
        return <MermaidDiagram chart={chart} />;
      }

      // Pass through to code component for syntax highlighting
      return <>{children}</>;
    },

    // Custom blockquote
    blockquote: ({ children }: { children: ReactNode }) => (
      <blockquote className="border-primary/50 bg-muted/30 my-8 border-l-4 py-4 pr-4 pl-6 leading-relaxed italic">
        {children}
      </blockquote>
    ),

    // Custom lists
    ul: ({ children }: { children: ReactNode }) => (
      <ul className="my-8 ml-6 list-disc space-y-3 [&>li]:pl-2 [&>li]:leading-relaxed">
        {children}
      </ul>
    ),
    ol: ({ children }: { children: ReactNode }) => (
      <ol className="my-8 ml-6 list-decimal space-y-3 [&>li]:pl-2 [&>li]:leading-relaxed">
        {children}
      </ol>
    ),
    li: ({ children }: { children: ReactNode }) => (
      <li className="text-foreground/90">{children}</li>
    ),

    // Custom table
    table: ({ children }: { children: ReactNode }) => (
      <div className="border-border/50 my-10 w-full overflow-y-auto rounded-lg border shadow-sm">
        <table className="w-full border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }: { children: ReactNode }) => (
      <thead className="bg-muted/50">{children}</thead>
    ),
    th: ({ children }: { children: ReactNode }) => (
      <th className="border-border/50 border-b px-6 py-4 text-left font-semibold [&[align=center]]:text-center [&[align=right]]:text-right">
        {children}
      </th>
    ),
    td: ({ children }: { children: ReactNode }) => (
      <td className="border-border/30 border-b px-6 py-4 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
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
