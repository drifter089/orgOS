import { type Metadata } from "next";
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
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <article className="prose prose-slate dark:prose-invert max-w-none">
            {children}
          </article>
        </div>
      </main>
    </div>
  );
}
