"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { api } from "@/trpc/react";

export function TransformerDebugger() {
  const [cronResult, setCronResult] = useState<string | null>(null);
  const [cronLoading, setCronLoading] = useState(false);

  const dataIngestionTransformers =
    api.transformer.listDataIngestionTransformers.useQuery();
  const chartTransformers = api.transformer.listChartTransformers.useQuery();
  const metrics = api.metric.getAll.useQuery();

  const deleteDataIngestion =
    api.transformer.deleteDataIngestionTransformer.useMutation({
      onSuccess: () => {
        void dataIngestionTransformers.refetch();
      },
    });

  const deleteChart = api.transformer.deleteChartTransformer.useMutation({
    onSuccess: () => {
      void chartTransformers.refetch();
    },
  });

  const refreshMetric = api.transformer.refreshMetric.useMutation({
    onSuccess: () => {
      void dataIngestionTransformers.refetch();
      void chartTransformers.refetch();
    },
  });

  const triggerCron = async () => {
    setCronLoading(true);
    try {
      const response = await fetch("/api/cron/poll-metrics", {
        method: "POST",
      });
      const data = (await response.json()) as unknown;
      setCronResult(JSON.stringify(data, null, 2));
      void dataIngestionTransformers.refetch();
      void chartTransformers.refetch();
    } catch (error) {
      setCronResult(
        `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    } finally {
      setCronLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cron Job</CardTitle>
          <CardDescription>
            Manually trigger the metric polling cron job
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={triggerCron} disabled={cronLoading}>
            {cronLoading ? "Running..." : "Trigger Cron Now"}
          </Button>
          {cronResult && (
            <pre className="bg-muted overflow-auto rounded p-4 text-sm">
              {cronResult}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Ingestion Transformers</CardTitle>
          <CardDescription>
            AI-generated code that transforms API responses into DataPoints.
            Shared across orgs (except GSheets which are per-metric).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataIngestionTransformers.isLoading ? (
            <p>Loading...</p>
          ) : dataIngestionTransformers.data?.length === 0 ? (
            <p className="text-muted-foreground">No transformers found</p>
          ) : (
            <div className="space-y-4">
              {dataIngestionTransformers.data?.map((t) => (
                <Collapsible key={t.id}>
                  <div className="flex items-center justify-between rounded border p-3">
                    <div>
                      <CollapsibleTrigger className="font-mono text-sm hover:underline">
                        {t.templateId}
                      </CollapsibleTrigger>
                      <p className="text-muted-foreground text-xs">
                        Updated: {new Date(t.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        deleteDataIngestion.mutate({ templateId: t.templateId })
                      }
                      disabled={deleteDataIngestion.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <pre className="bg-muted mt-2 overflow-auto rounded p-4 text-xs">
                      {t.transformerCode}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chart Transformers</CardTitle>
          <CardDescription>
            AI-generated code that transforms DataPoints into chart configs. One
            per dashboard chart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartTransformers.isLoading ? (
            <p>Loading...</p>
          ) : chartTransformers.data?.length === 0 ? (
            <p className="text-muted-foreground">No chart transformers found</p>
          ) : (
            <div className="space-y-4">
              {chartTransformers.data?.map((t) => (
                <Collapsible key={t.id}>
                  <div className="flex items-center justify-between rounded border p-3">
                    <div>
                      <CollapsibleTrigger className="font-mono text-sm hover:underline">
                        {t.dashboardChart.metric.name}
                      </CollapsibleTrigger>
                      <p className="text-muted-foreground text-xs">
                        Type: {t.chartType} | Range: {t.dateRange} | v
                        {t.version}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        deleteChart.mutate({
                          dashboardChartId: t.dashboardChartId,
                        })
                      }
                      disabled={deleteChart.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <pre className="bg-muted mt-2 overflow-auto rounded p-4 text-xs">
                      {t.transformerCode}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
          <CardDescription>
            Manually refresh metrics to fetch new data and regenerate
            transformers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.isLoading ? (
            <p>Loading...</p>
          ) : metrics.data?.length === 0 ? (
            <p className="text-muted-foreground">No metrics found</p>
          ) : (
            <div className="space-y-2">
              {metrics.data?.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-muted-foreground text-xs">
                      Template: {m.templateId ?? "none"} | Last fetched:{" "}
                      {m.lastFetchedAt
                        ? new Date(m.lastFetchedAt).toLocaleString()
                        : "never"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshMetric.mutate({ metricId: m.id })}
                    disabled={refreshMetric.isPending}
                  >
                    Refresh
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
