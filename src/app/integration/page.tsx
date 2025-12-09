import {
  GitHubMetricDialog,
  GoogleSheetsMetricDialog,
  LinearMetricDialog,
  PostHogMetricDialog,
  YouTubeMetricDialog,
} from "@/app/metric/_components";
import { api } from "@/trpc/server";

import { AddPlatformButton, IntegrationGrid } from "./_components";

export default async function IntegrationPage() {
  const integrations = await api.integration.listWithStats();

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect and manage your organization&apos;s 3rd party service
          integrations
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Connected Platforms</h2>
        <AddPlatformButton />
      </div>

      <IntegrationGrid
        initialData={integrations}
        gridCols={4}
        showMetricDialogs={true}
        MetricDialogs={{
          github: GitHubMetricDialog,
          posthog: PostHogMetricDialog,
          youtube: YouTubeMetricDialog,
          "google-sheet": GoogleSheetsMetricDialog,
          linear: LinearMetricDialog,
        }}
      />
    </div>
  );
}
