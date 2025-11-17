import { IntegrationTester } from "./_components/integration-tester";

export default function ApiTestPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">API Endpoint Testing</h1>
        <p className="text-muted-foreground mt-1">
          Test all your integration endpoints to verify connectivity and data
          access
        </p>
      </div>

      {/* Integration Tester */}
      <IntegrationTester />
    </div>
  );
}
