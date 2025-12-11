import { TransformerDebugger } from "./_components/transformer-debugger";

export default function DevToolsPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Developer Tools</h1>
        <p className="text-muted-foreground mt-1">
          Debug transformers, view generated code, and trigger data refresh
        </p>
      </div>
      <TransformerDebugger />
    </div>
  );
}
