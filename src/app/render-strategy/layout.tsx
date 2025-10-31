import Link from "next/link";

import { ArrowLeft } from "lucide-react";

export default function RenderStrategyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 space-y-4">
        <Link
          href="/docs/architecture/concepts"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Architecture Docs
        </Link>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Mutation Strategy Comparison
          </h1>
          <p className="text-muted-foreground text-lg">
            Interactive demonstration of TanStack Query cache update patterns
            with nested Server/Client components
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}
