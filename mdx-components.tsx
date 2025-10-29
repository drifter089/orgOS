import type { MDXComponents } from "mdx/types";
import Image, { type ImageProps } from "next/image";
import Link from "next/link";
import { Button } from "./src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./src/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "./src/components/ui/alert";
import { Badge } from "./src/components/ui/badge";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Custom heading styles
    h1: ({ children }) => (
      <h1 className="mb-6 mt-8 scroll-m-20 text-4xl font-bold tracking-tight">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-4 mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-4 mt-8 scroll-m-20 text-2xl font-semibold tracking-tight">
        {children}
      </h3>
    ),

    // Custom paragraph
    p: ({ children }) => (
      <p className="mb-4 leading-7 [&:not(:first-child)]:mt-6">
        {children}
      </p>
    ),

    // Custom links with Next.js Link component
    a: ({ href, children }) => {
      const isExternal = href?.startsWith("http");
      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 hover:text-primary"
          >
            {children}
          </a>
        );
      }
      return (
        <Link
          href={href ?? "#"}
          className="font-medium underline underline-offset-4 hover:text-primary"
        >
          {children}
        </Link>
      );
    },

    // Custom image with Next.js Image component
    img: (props) => (
      <Image
        {...(props as ImageProps)}
        alt={props.alt ?? ""}
        width={800}
        height={600}
        className="rounded-lg border"
      />
    ),

    // Custom code blocks
    code: ({ children, className }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
            {children}
          </code>
        );
      }
      return <code className={className}>{children}</code>;
    },

    // Custom blockquote
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-l-2 border-primary pl-6 italic">
        {children}
      </blockquote>
    ),

    // Custom lists
    ul: ({ children }) => (
      <ul className="my-6 ml-6 list-disc [&>li]:mt-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">{children}</ol>
    ),

    // Custom table
    table: ({ children }) => (
      <div className="my-6 w-full overflow-y-auto">
        <table className="w-full border-collapse border">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
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
