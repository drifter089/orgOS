"use client";

import { useState } from "react";

import Nango from "@nangohq/frontend";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export default function MetricPage() {
  const [status, setStatus] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Metric creation state per integration
  const [creatingMetricFor, setCreatingMetricFor] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [metricName, setMetricName] = useState<string>("");
  const [targetValue, setTargetValue] = useState<string>("");
  const [metricConfig, setMetricConfig] = useState<any>({});

  // Queries
  const { data: integrations, refetch: refetchIntegrations } =
    api.integration.list.useQuery(undefined, {
      refetchInterval: 10000,
    });

  const { data: stats } = api.integration.stats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  // Metric queries for active integration
  const { data: availableTemplates } =
    api.integrationMetrics.getAvailableTemplates.useQuery(
      {
        integrationId:
          integrations?.find((i) => i.id === creatingMetricFor)
            ?.integrationId ?? "",
      },
      { enabled: !!creatingMetricFor },
    );

  const { data: posthogProjects } =
    api.integrationMetrics.getPostHogProjects.useQuery(
      {
        connectionId:
          integrations?.find((i) => i.id === creatingMetricFor)
            ?.connectionId ?? "",
      },
      {
        enabled:
          !!creatingMetricFor &&
          integrations?.find((i) => i.id === creatingMetricFor)
            ?.integrationId === "posthog",
      },
    );

  const { data: availableSources } =
    api.integrationMetrics.getSelectableSources.useQuery(
      {
        connectionId:
          integrations?.find((i) => i.id === creatingMetricFor)
            ?.connectionId ?? "",
        integrationId:
          integrations?.find((i) => i.id === creatingMetricFor)
            ?.integrationId ?? "",
        sourceType: getSourceTypeFromTemplate(selectedTemplate),
        nangoModel: getNangoModelFromTemplate(selectedTemplate),
        projectId: selectedProject || undefined,
      },
      {
        enabled:
          !!creatingMetricFor &&
          !!selectedTemplate &&
          (integrations?.find((i) => i.id === creatingMetricFor)
            ?.integrationId !== "posthog" ||
            !!selectedProject),
      },
    );

  const { data: metricsForIntegration } =
    api.integrationMetrics.listByIntegration.useQuery(
      {
        connectionId:
          integrations?.find((i) => i.id === creatingMetricFor)
            ?.connectionId ?? "",
      },
      { enabled: !!creatingMetricFor },
    );

  // Mutations
  const revokeMutation = api.integration.revoke.useMutation({
    onSuccess: () => {
      void refetchIntegrations();
      setStatus("Integration revoked successfully");
    },
  });

  const createMetricMutation = api.integrationMetrics.create.useMutation({
    onSuccess: () => {
      setStatus("Metric created successfully!");
      resetMetricForm();
    },
    onError: (error) => {
      setStatus(`Error: ${error.message}`);
    },
  });

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setStatus("Fetching session token...");

      const response = await fetch("/api/nango/session", { method: "POST" });
      if (!response.ok) throw new Error("Failed to get session token");

      const data = (await response.json()) as { sessionToken: string };
      setStatus("Opening Nango Connect UI...");

      const nango = new Nango({ connectSessionToken: data.sessionToken });
      nango.openConnectUI({
        onEvent: (event) => {
          if (event.type === "connect") {
            setStatus("Connected! Refreshing...");
            setTimeout(() => void refetchIntegrations(), 2000);
          } else if (event.type === "close") {
            setStatus("");
            setIsConnecting(false);
          }
        },
      });
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : "Unknown"}`);
      setIsConnecting(false);
    }
  };

  const handleCreateMetric = () => {
    if (!creatingMetricFor || !selectedTemplate || !selectedSource || !metricName) {
      setStatus("Please fill in all required fields");
      return;
    }

    const integration = integrations?.find((i) => i.id === creatingMetricFor);
    if (!integration) return;

    const config: any = {
      templateId: selectedTemplate,
      ...metricConfig,
    };

    if (integration.integrationId === "posthog") {
      if (!selectedProject) {
        setStatus("Please select a PostHog project");
        return;
      }
      config.projectId = selectedProject;
    }

    createMetricMutation.mutate({
      connectionId: integration.connectionId,
      integrationId: integration.integrationId,
      templateId: selectedTemplate,
      sourceId: selectedSource,
      config,
      metricName,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
    });
  };

  const resetMetricForm = () => {
    setSelectedTemplate("");
    setSelectedProject("");
    setSelectedSource("");
    setMetricName("");
    setTargetValue("");
    setMetricConfig({});
  };

  function getSourceTypeFromTemplate(templateId: string): "event" | "sheet" {
    if (templateId.includes("event")) return "event";
    if (templateId.includes("sheet")) return "sheet";
    return "event";
  }

  function getNangoModelFromTemplate(templateId: string): string {
    const template = availableTemplates?.find((t: any) => t.id === templateId);
    return template?.nangoModel || "";
  }

  // Calculate form progress for current integration
  const getFormProgress = () => {
    const integration = integrations?.find((i) => i.id === creatingMetricFor);
    const isPosthog = integration?.integrationId === "posthog";

    let steps = 0;
    let completed = 0;

    // Step 1: Template
    steps++;
    if (selectedTemplate) completed++;

    // Step 2: PostHog Project (conditional)
    if (isPosthog) {
      steps++;
      if (selectedProject) completed++;
    }

    // Step 3: Source
    steps++;
    if (selectedSource) completed++;

    // Step 4: Config
    steps++;
    if (metricName) completed++;

    return { steps, completed, percentage: (completed / steps) * 100 };
  };

  const formProgress = getFormProgress();

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-6 sm:p-8">
      {/* Header Section */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Integrations & Metrics</h1>
        <p className="text-base text-muted-foreground max-w-3xl">
          Connect third-party services and create metrics from your data sources to track your key performance indicators
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Integrations */}
          <Card className="transition-all hover:scale-[1.02]">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                Total Integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">{stats.total}</div>
                <Badge variant="outline" className="text-xs">
                  Connected
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Active */}
          <Card className="transition-all hover:scale-[1.02]">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                Active
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                  {stats.active}
                </div>
                <Badge variant="default" className="bg-green-600 hover:bg-green-600 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30 text-xs">
                  Syncing
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          <Card className="transition-all hover:scale-[1.02]">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                Error
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-red-600 dark:text-red-500">
                  {stats.error}
                </div>
                <Badge variant="destructive" className="text-xs">
                  Needs Attention
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Revoked */}
          <Card className="transition-all hover:scale-[1.02]">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                Revoked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-muted-foreground">
                  {stats.revoked}
                </div>
                <Badge variant="secondary" className="text-xs">
                  Disconnected
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Alert */}
      {status && (
        <Alert className={cn(
          "transition-all duration-300",
          status.startsWith("Error")
            ? "border-destructive/50 bg-destructive/10 text-destructive"
            : status.includes("success") || status.includes("Connected")
              ? "border-green-600/50 bg-green-600/10 text-green-700 dark:text-green-400"
              : "border-primary/50 bg-primary/10"
        )}>
          <AlertDescription className="font-medium">{status}</AlertDescription>
        </Alert>
      )}

      {/* Connect New Integration Card */}
      <Card className="border-dashed border-2 hover:border-primary/50 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl">Connect New Integration</CardTitle>
          <CardDescription className="text-base">
            Add PostHog, Slack, Google Sheets, or other services to start tracking metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            size="lg"
            className="gap-2"
          >
            {isConnecting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Connecting...
              </>
            ) : (
              <>
                <span className="text-lg">+</span>
                Connect Integration
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Integration Cards */}
      <div className="space-y-4">
        {integrations?.map((integration) => (
          <Card key={integration.id} className="overflow-hidden transition-all duration-300 hover:shadow-lg">
            {/* Integration Header */}
            <CardHeader className="bg-accent/30 dark:bg-accent/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CardTitle className="text-2xl capitalize">
                      {integration.integrationId}
                    </CardTitle>
                    <Badge
                      variant={
                        integration.status === "active"
                          ? "default"
                          : integration.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs px-3 py-1"
                    >
                      {integration.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono">
                    Connection ID: {integration.connectionId}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revokeMutation.mutate({ connectionId: integration.connectionId })}
                  className="shrink-0"
                >
                  Revoke Access
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Existing Metrics List */}
              {creatingMetricFor === integration.id && metricsForIntegration && metricsForIntegration.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">Configured Metrics</h4>
                    <Badge variant="secondary" className="text-xs">
                      {metricsForIntegration.length}
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {metricsForIntegration.map((metric: any) => (
                      <div
                        key={metric.id}
                        className="group flex items-center justify-between rounded-lg border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">{metric.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Source: {metric.integrationMetric.sourceId}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-sm px-3 py-1.5 font-mono">
                          {metric.currentValue ?? "—"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                </div>
              )}

              {/* Add Metric Section */}
              <Collapsible
                open={creatingMetricFor === integration.id}
                onOpenChange={(open) => {
                  if (open) {
                    setCreatingMetricFor(integration.id);
                  } else {
                    setCreatingMetricFor(null);
                    resetMetricForm();
                  }
                }}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant={creatingMetricFor === integration.id ? "secondary" : "outline"}
                    className="w-full group"
                  >
                    <span className="text-base group-hover:scale-110 transition-transform">
                      {creatingMetricFor === integration.id ? "−" : "+"}
                    </span>
                    {creatingMetricFor === integration.id ? "Cancel Metric Creation" : "Add New Metric"}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                  {/* Progress Indicator */}
                  {creatingMetricFor === integration.id && (
                    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Configuration Progress</span>
                        <span className="text-xs text-muted-foreground">
                          Step {formProgress.completed} of {formProgress.steps}
                        </span>
                      </div>
                      <Progress value={formProgress.percentage} className="h-2" />
                    </div>
                  )}

                  {/* Step 1: Select Template */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                        selectedTemplate
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        1
                      </div>
                      <Label className="text-base font-semibold">Select Metric Type</Label>
                    </div>
                    <Select
                      value={selectedTemplate}
                      onValueChange={(value) => {
                        setSelectedTemplate(value);
                        setSelectedSource("");
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Choose the type of metric you want to track..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTemplates?.map((template: any) => (
                          <SelectItem key={template.id} value={template.id} className="py-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{template.name}</span>
                              <span className="text-xs text-muted-foreground">{template.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 2: Select PostHog Project (conditional) */}
                  {selectedTemplate && integration.integrationId === "posthog" && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                            selectedProject
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}>
                            2
                          </div>
                          <Label className="text-base font-semibold">Select PostHog Project</Label>
                        </div>
                        <Select
                          value={selectedProject}
                          onValueChange={(value) => {
                            setSelectedProject(value);
                            setSelectedSource("");
                          }}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Choose your PostHog project..." />
                          </SelectTrigger>
                          <SelectContent>
                            {posthogProjects?.projects.map((project: any) => (
                              <SelectItem key={project.id} value={project.id} className="py-3">
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Step 3: Select Source */}
                  {selectedTemplate &&
                    (integration.integrationId !== "posthog" || selectedProject) && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                              selectedSource
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {integration.integrationId === "posthog" ? "3" : "2"}
                            </div>
                            <Label className="text-base font-semibold">Select Data Source</Label>
                          </div>
                          <Select value={selectedSource} onValueChange={setSelectedSource}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Choose the specific data source..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSources?.map((source: any) => (
                                <SelectItem key={source.id} value={source.id} className="py-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span>{source.name}</span>
                                    {source.metadata?.count && (
                                      <Badge variant="secondary" className="text-xs">
                                        {source.metadata.count}
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                  {/* Step 4: Configure Metric */}
                  {selectedSource && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                            metricName
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {integration.integrationId === "posthog" ? "4" : "3"}
                          </div>
                          <Label className="text-base font-semibold">Configure Metric Details</Label>
                        </div>

                        <div className="space-y-4 rounded-lg border border-border/60 bg-accent/20 p-4">
                          {/* Metric Name */}
                          <div className="space-y-2">
                            <Label htmlFor="metricName" className="text-sm font-medium">
                              Metric Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="metricName"
                              placeholder="e.g., Weekly Sign-Up Count"
                              value={metricName}
                              onChange={(e) => setMetricName(e.target.value)}
                              className="h-10"
                            />
                          </div>

                          {/* Target Value */}
                          <div className="space-y-2">
                            <Label htmlFor="targetValue" className="text-sm font-medium">
                              Target Value <span className="text-xs text-muted-foreground">(optional)</span>
                            </Label>
                            <Input
                              id="targetValue"
                              type="number"
                              placeholder="e.g., 1000"
                              value={targetValue}
                              onChange={(e) => setTargetValue(e.target.value)}
                              className="h-10"
                            />
                          </div>

                          {/* No additional config needed for simplified templates */}
                          {/* event_count: Just needs project + event (selected above) */}
                          {/* sheet_row_count: Just needs sheet (selected above) */}
                        </div>

                        {/* Create Button */}
                        <Button
                          onClick={handleCreateMetric}
                          disabled={createMetricMutation.isPending}
                          size="lg"
                          className="w-full"
                        >
                          {createMetricMutation.isPending ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Creating Metric...
                            </>
                          ) : (
                            "Create Metric"
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!integrations || integrations.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl text-muted-foreground">
              ?
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium">No integrations connected yet</p>
              <p className="text-sm text-muted-foreground">
                Click "Connect Integration" above to get started with your first integration
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Custom Integrations - Coming Soon */}
      <Card className="mt-8 border-dashed">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Custom Integrations
                <Badge variant="secondary">Coming Soon</Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                Track metrics from custom data sources like Instagram, custom APIs, webhooks, and more
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="text-sm font-medium mb-1">Instagram Analytics</div>
              <div className="text-xs text-muted-foreground">
                Track followers, engagement, post metrics via Instagram URL
              </div>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="text-sm font-medium mb-1">Custom API</div>
              <div className="text-xs text-muted-foreground">
                Connect any REST API with custom authentication and data extraction
              </div>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="text-sm font-medium mb-1">Webhook Receiver</div>
              <div className="text-xs text-muted-foreground">
                Receive real-time metric updates via webhook endpoints
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Infrastructure is ready. Custom integration UI will be available in the next release.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
