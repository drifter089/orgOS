import { type Metadata } from "next";

import { TableOfContents } from "./_components/TableOfContents";
import { DocsSidebar } from "./_components/sidebar";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Project documentation",
};

export default function DocsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <DocsSidebar />
      <main className="flex-1">
        <div className="container mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
          <div className="flex gap-8">
            <article className="prose prose-slate dark:prose-invert prose-headings:scroll-mt-24 max-w-none min-w-0 flex-1">
              {children}
            </article>
            <TableOfContents />
          </div>
        </div>
      </main>
    </div>
  );
}
