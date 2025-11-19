import { api } from "@/trpc/server";

import { IntegrationClient } from "./_components/integration-client";

export default async function IntegrationPage() {
  // Prefetch data on server for instant page load
  const integrations = await api.integration.listWithStats();

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect and manage your organization&apos;s 3rd party service
          integrations
        </p>
      </div>

      <IntegrationClient initialData={integrations} />
    </div>
  );
}
