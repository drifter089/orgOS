import { redirect } from "next/navigation";

import { env } from "@/env";
import { HydrateClient, api } from "@/trpc/server";

import { DevMetricClient } from "./_components/dev-metric-client";

interface DevMetricToolPageProps {
  params: Promise<{ id: string }>;
}

export default async function DevMetricToolPage({
  params,
}: DevMetricToolPageProps) {
  // Block access in production
  if (env.NODE_ENV !== "development") {
    redirect("/");
  }

  const { id } = await params;

  await api.devTool.getMetricPipelineData.prefetch({ metricId: id });

  return (
    <HydrateClient>
      <DevMetricClient metricId={id} />
    </HydrateClient>
  );
}
