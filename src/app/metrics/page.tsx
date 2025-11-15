"use client";

import { useState } from "react";

import { Plus, RefreshCw, Trash2, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

export default function MetricsPage() {
  const [activeTab, setActiveTab] = useState<
    "integration" | "scraper" | "self"
  >("scraper");

  // Fetch all metrics
  const { data: metrics, refetch: refetchMetrics } =
    api.metric.getAll.useQuery();

  // Fetch integrations for Integration Metrics tab
  const { data: integrationData } = api.integration.listWithStats.useQuery();
  const integrations = integrationData?.active ?? [];

  // Refresh all metrics mutation
  const refreshAllMutation = api.metric.refreshAllMetrics.useMutation({
    onSuccess: () => {
      void refetchMetrics();
    },
  });

  // Refresh single metric mutation
  const refreshMetricMutation = api.metric.refreshMetric.useMutation({
    onSuccess: () => {
      void refetchMetrics();
    },
  });

  // Delete metric mutation
  const deleteMetricMutation = api.metric.delete.useMutation({
    onSuccess: () => {
      void refetchMetrics();
    },
  });

  const handleRefreshAll = () => {
    refreshAllMutation.mutate();
  };

  const handleRefreshMetric = (metricId: string) => {
    refreshMetricMutation.mutate({ metricId });
  };

  const handleDeleteMetric = (metricId: string, metricName: string) => {
    if (confirm(`Are you sure you want to delete "${metricName}"?`)) {
      deleteMetricMutation.mutate({ id: metricId });
    }
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Metrics</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage KPI metrics from integrations, scrapers, or manual
            entry
          </p>
        </div>
        <Button
          onClick={handleRefreshAll}
          disabled={refreshAllMutation.isPending}
          size="lg"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshAllMutation.isPending ? "animate-spin" : ""}`}
          />
          Sync All Metrics
        </Button>
      </div>

      {/* Existing Metrics List */}
      {metrics && metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Metrics</CardTitle>
            <CardDescription>
              {metrics.length} metric{metrics.length !== 1 ? "s" : ""}{" "}
              configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-primary h-4 w-4" />
                      <h3 className="font-semibold">{metric.name}</h3>
                      <Badge variant="outline" className="capitalize">
                        {metric.sourceType.replace("_", " ")}
                      </Badge>
                    </div>
                    {metric.description && (
                      <p className="text-muted-foreground text-sm">
                        {metric.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Type: <strong>{metric.type}</strong>
                      </span>
                      {metric.targetValue !== null && (
                        <span className="text-muted-foreground">
                          Target:{" "}
                          <strong>
                            {metric.targetValue}
                            {metric.unit}
                          </strong>
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        Data Points: <strong>{metric._count.dataPoints}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshMetric(metric.id)}
                      disabled={refreshMetricMutation.isPending}
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${refreshMetricMutation.isPending ? "animate-spin" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMetric(metric.id, metric.name)}
                      disabled={deleteMetricMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Create New Metric */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Metric
          </CardTitle>
          <CardDescription>
            Choose a data source and configure your metric
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="integration">Integration</TabsTrigger>
              <TabsTrigger value="scraper">Scraper</TabsTrigger>
              <TabsTrigger value="self">Self-Reported</TabsTrigger>
            </TabsList>

            <TabsContent value="integration" className="space-y-4">
              <IntegrationMetricsTab
                integrations={integrations}
                onSuccess={() => void refetchMetrics()}
              />
            </TabsContent>

            <TabsContent value="scraper" className="space-y-4">
              <ScraperMetricsTab onSuccess={() => void refetchMetrics()} />
            </TabsContent>

            <TabsContent value="self" className="space-y-4">
              <SelfReportedMetricsTab onSuccess={() => void refetchMetrics()} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Integration Metrics Tab Component
function IntegrationMetricsTab({
  integrations,
  onSuccess: _onSuccess,
}: {
  integrations: { id: string; integrationId: string; connectionId: string }[];
  onSuccess: () => void;
}) {
  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-muted-foreground mb-4">
          Integration-based metrics will pull data automatically from your
          connected services.
        </p>
        <div className="space-y-2">
          <p className="text-sm font-medium">Available Integrations:</p>
          {integrations.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {integrations.map((integration) => (
                <Badge
                  key={integration.id}
                  variant="secondary"
                  className="capitalize"
                >
                  {integration.integrationId}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No integrations connected. Go to{" "}
              <a href="/integrations" className="text-primary underline">
                Integrations
              </a>{" "}
              to connect services.
            </p>
          )}
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          🚧 Integration metrics configuration coming soon
        </p>
      </div>
    </div>
  );
}

// Scraper Metrics Tab Component
function ScraperMetricsTab({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<
    "percentage" | "number" | "duration" | "rate"
  >("number");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [cellReference, setCellReference] = useState("");
  const [range, setRange] = useState("");
  const [aggregation, setAggregation] = useState<
    "sum" | "average" | "min" | "max" | "count" | "none"
  >("none");

  const createMetricMutation = api.metric.create.useMutation({
    onSuccess: () => {
      // Reset form
      setName("");
      setDescription("");
      setType("number");
      setTargetValue("");
      setUnit("");
      setSourceUrl("");
      setSheetName("");
      setCellReference("");
      setRange("");
      setAggregation("none");
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse sheet ID from URL
    const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(sourceUrl);
    const sheetId = match?.[1];

    if (!sheetId) {
      alert("Invalid Google Sheets URL. Please use a valid spreadsheet link.");
      return;
    }

    createMetricMutation.mutate({
      name,
      description: description || undefined,
      type,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      unit: unit || undefined,
      sourceType: "scraping",
      sourceUrl,
      sourceConfig: {
        scraperType: "google-sheets",
        sheetId,
        sheetName: sheetName || undefined,
        cellReference: cellReference || undefined,
        range: range || undefined,
        aggregation: aggregation !== "none" ? aggregation : undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="scraper-name">Metric Name *</Label>
          <Input
            id="scraper-name"
            placeholder="e.g., Monthly Revenue"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scraper-type">Type *</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger id="scraper-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
              <SelectItem value="rate">Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scraper-description">Description</Label>
        <Textarea
          id="scraper-description"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="scraper-target">Target Value</Label>
          <Input
            id="scraper-target"
            type="number"
            placeholder="e.g., 100"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scraper-unit">Unit</Label>
          <Input
            id="scraper-unit"
            placeholder="e.g., $, %, ms"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium">Google Sheets Configuration</h4>

        <div className="space-y-2">
          <Label htmlFor="sheets-url">Google Sheets URL *</Label>
          <Input
            id="sheets-url"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            required
          />
          <p className="text-muted-foreground text-xs">
            Must be a public Google Sheets link
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sheet-name">Sheet Name</Label>
            <Input
              id="sheet-name"
              placeholder="e.g., Sheet1 (optional)"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cell-ref">Cell Reference</Label>
            <Input
              id="cell-ref"
              placeholder="e.g., A1, B5"
              value={cellReference}
              onChange={(e) => setCellReference(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="range">Range (optional)</Label>
            <Input
              id="range"
              placeholder="e.g., A1:B10"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aggregation">Aggregation (for ranges)</Label>
            <Select
              value={aggregation}
              onValueChange={(v) => setAggregation(v as typeof aggregation)}
            >
              <SelectTrigger id="aggregation">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sum">Sum</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="min">Minimum</SelectItem>
                <SelectItem value="max">Maximum</SelectItem>
                <SelectItem value="count">Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={createMetricMutation.isPending}
        className="w-full"
      >
        {createMetricMutation.isPending
          ? "Creating..."
          : "Create Scraper Metric"}
      </Button>

      {createMetricMutation.error && (
        <p className="text-sm text-red-600">
          {createMetricMutation.error.message}
        </p>
      )}
    </form>
  );
}

// Self-Reported Metrics Tab Component
function SelfReportedMetricsTab({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<
    "percentage" | "number" | "duration" | "rate"
  >("number");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");

  const createMetricMutation = api.metric.create.useMutation({
    onSuccess: () => {
      // Reset form
      setName("");
      setDescription("");
      setType("number");
      setTargetValue("");
      setUnit("");
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createMetricMutation.mutate({
      name,
      description: description || undefined,
      type,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      unit: unit || undefined,
      sourceType: "self_reported",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="self-name">Metric Name *</Label>
          <Input
            id="self-name"
            placeholder="e.g., Team Morale"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="self-type">Type *</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger id="self-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
              <SelectItem value="rate">Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="self-description">Description</Label>
        <Textarea
          id="self-description"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="self-target">Target Value</Label>
          <Input
            id="self-target"
            type="number"
            placeholder="e.g., 100"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="self-unit">Unit</Label>
          <Input
            id="self-unit"
            placeholder="e.g., points, score"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-dashed p-4">
        <p className="text-muted-foreground text-sm">
          💡 Self-reported metrics require manual data entry. You&apos;ll be
          able to report values from your team dashboard or via the metrics list
          above.
        </p>
      </div>

      <Button
        type="submit"
        disabled={createMetricMutation.isPending}
        className="w-full"
      >
        {createMetricMutation.isPending
          ? "Creating..."
          : "Create Self-Reported Metric"}
      </Button>

      {createMetricMutation.error && (
        <p className="text-sm text-red-600">
          {createMetricMutation.error.message}
        </p>
      )}
    </form>
  );
}
