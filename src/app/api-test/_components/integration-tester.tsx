"use client";

import React, { useState } from "react";

import {
  CheckCircle2,
  Github,
  Loader2,
  PlayCircle,
  Sheet,
  Video,
  XCircle,
} from "lucide-react";

import { JsonViewer } from "@/components/json-viewer";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Import service configs from shared integration registry
import { serviceConfig as githubService } from "@/lib/integrations/github";
import { serviceConfig as googleSheetsService } from "@/lib/integrations/google-sheets";
import { serviceConfig as posthogService } from "@/lib/integrations/posthog";
import { serviceConfig as youtubeService } from "@/lib/integrations/youtube";
import { api } from "@/trpc/react";

interface ServiceEndpoint {
  label: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  description?: string;
  requiresParams?: boolean;
  params?: string[];
}

type TestStatus = "idle" | "running" | "success" | "fail";

interface TestResult {
  status: TestStatus;
  statusCode?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response?: any;
  error?: string;
}

const SERVICE_CONFIGS = {
  github: githubService,
  "google-sheet": googleSheetsService,
  posthog: posthogService,
  youtube: youtubeService,
};

export function IntegrationTester() {
  const [selectedIntegrationConnectionId, setSelectedIntegrationConnectionId] =
    useState<string | null>(null);
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(
    new Map(),
  );
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [endpointParams, setEndpointParams] = useState<
    Map<string, Record<string, string>>
  >(new Map());

  // Fetch all integrations
  const { data: integrationsData } = api.integration.listWithStats.useQuery();
  const activeIntegrations = integrationsData?.active ?? [];

  // Get selected integration details
  const selectedIntegration = activeIntegrations.find(
    (i) => i.connectionId === selectedIntegrationConnectionId,
  );

  // Get service config based on selected integration (no API call - direct import)
  const serviceConfig = selectedIntegration?.integrationId
    ? SERVICE_CONFIGS[
        selectedIntegration.integrationId as keyof typeof SERVICE_CONFIGS
      ]
    : null;

  const handleIntegrationChange = (connectionId: string) => {
    setSelectedIntegrationConnectionId(connectionId);
    setTestResults(new Map());
    setEndpointParams(new Map());
  };

  const getEndpointKey = (endpoint: ServiceEndpoint) => {
    // Include label to make keys unique for endpoints with same path (e.g., PostHog Query API)
    return `${endpoint.method}:${endpoint.path}:${endpoint.label}`;
  };

  const updateTestResult = (endpointKey: string, result: TestResult) => {
    setTestResults((prev) => new Map(prev).set(endpointKey, result));
  };

  const updateEndpointParam = (
    endpointKey: string,
    paramName: string,
    value: string,
  ) => {
    setEndpointParams((prev) => {
      const newParams = new Map(prev);
      const currentParams = newParams.get(endpointKey) ?? {};
      newParams.set(endpointKey, { ...currentParams, [paramName]: value });
      return newParams;
    });
  };

  const testEndpoint = async (
    endpoint: ServiceEndpoint,
    connectionId: string,
    integrationId: string,
  ) => {
    const endpointKey = getEndpointKey(endpoint);

    updateTestResult(endpointKey, { status: "running" });

    try {
      const params = endpointParams.get(endpointKey);

      // Call tRPC endpoint using fetch (imperative call)
      const queryParams = new URLSearchParams({
        input: JSON.stringify({
          connectionId,
          integrationId,
          endpoint: endpoint.path,
          method: endpoint.method,
          params: params && Object.keys(params).length > 0 ? params : undefined,
        }),
      });

      const response = await fetch(
        `/api/trpc/metric.fetchIntegrationData?${queryParams.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const result = json.result.data;

      const statusCode = result.status ?? 200;
      updateTestResult(endpointKey, {
        status: statusCode >= 200 && statusCode < 300 ? "success" : "fail",
        statusCode,
        response: result.data,
      });
    } catch (error) {
      updateTestResult(endpointKey, {
        status: "fail",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleTestOne = (endpoint: ServiceEndpoint) => {
    if (!selectedIntegrationConnectionId || !selectedIntegration) return;
    void testEndpoint(
      endpoint,
      selectedIntegrationConnectionId,
      selectedIntegration.integrationId,
    );
  };

  const handleRunAll = async () => {
    if (
      !selectedIntegrationConnectionId ||
      !selectedIntegration ||
      !serviceConfig
    )
      return;

    setIsRunningAll(true);

    // Sequential execution
    for (const endpoint of serviceConfig.endpoints as ServiceEndpoint[]) {
      await testEndpoint(
        endpoint,
        selectedIntegrationConnectionId,
        selectedIntegration.integrationId,
      );
    }

    setIsRunningAll(false);
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getServiceIcon = (integrationId: string) => {
    switch (integrationId) {
      case "github":
        return <Github className="h-5 w-5" />;
      case "google-sheet":
        return <Sheet className="h-5 w-5" />;
      case "youtube":
        return <Video className="h-5 w-5" />;
      default:
        return <PlayCircle className="h-5 w-5" />;
    }
  };

  const getTestStats = () => {
    const total = serviceConfig?.endpoints.length ?? 0;
    let tested = 0;
    let passed = 0;
    let failed = 0;

    testResults.forEach((result) => {
      if (result.status !== "idle") tested++;
      if (result.status === "success") passed++;
      if (result.status === "fail") failed++;
    });

    return { total, tested, passed, failed };
  };

  const stats = getTestStats();

  if (activeIntegrations.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center">
          <Alert>
            <AlertDescription>
              No active integrations found. Please connect an integration first
              from the{" "}
              <a href="/integration" className="underline">
                Integrations page
              </a>
              .
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Integration Selection & Global Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Select Integration</CardTitle>
          <CardDescription>
            Choose an integration to test all its endpoints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select onValueChange={handleIntegrationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an integration..." />
            </SelectTrigger>
            <SelectContent>
              {activeIntegrations.map((integration) => (
                <SelectItem
                  key={integration.connectionId}
                  value={integration.connectionId}
                >
                  <div className="flex items-center gap-2">
                    {getServiceIcon(integration.integrationId)}
                    <span className="capitalize">
                      {integration.integrationId}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ({integration.connectionId.slice(0, 8)}...)
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedIntegrationConnectionId && serviceConfig && (
            <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Test Progress</p>
                <div className="flex gap-4 text-sm">
                  <span>
                    Total: <strong>{stats.total}</strong>
                  </span>
                  <span>
                    Tested: <strong>{stats.tested}</strong>
                  </span>
                  <span className="text-green-600">
                    Passed: <strong>{stats.passed}</strong>
                  </span>
                  <span className="text-red-600">
                    Failed: <strong>{stats.failed}</strong>
                  </span>
                </div>
              </div>
              <Button
                onClick={handleRunAll}
                disabled={isRunningAll}
                size="lg"
                className="gap-2"
              >
                {isRunningAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running All...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Run All Endpoints
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Endpoint Cards */}
      {selectedIntegrationConnectionId && serviceConfig && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {getServiceIcon(selectedIntegration?.integrationId ?? "")}
            <h3 className="text-xl font-semibold">
              {serviceConfig.name} Endpoints
            </h3>
            <Badge variant="outline">
              {serviceConfig.endpoints.length} endpoints
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(serviceConfig.endpoints as ServiceEndpoint[]).map((endpoint) => {
              const endpointKey = getEndpointKey(endpoint);
              const result = testResults.get(endpointKey);
              const params = endpointParams.get(endpointKey) ?? {};

              return (
                <Card
                  key={endpointKey}
                  className={
                    result?.status === "success"
                      ? "border-green-200"
                      : result?.status === "fail"
                        ? "border-red-200"
                        : ""
                  }
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {endpoint.label}
                          {getStatusIcon(result?.status ?? "idle")}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          {endpoint.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {endpoint.method}
                      </Badge>
                      <span className="text-muted-foreground truncate font-mono text-xs">
                        {endpoint.path}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3">
                    {/* Parameters */}
                    {endpoint.requiresParams && endpoint.params && (
                      <div className="space-y-2">
                        {endpoint.params.map((param) => (
                          <div key={param} className="space-y-1">
                            <Label
                              htmlFor={`${endpointKey}-${param}`}
                              className="text-xs"
                            >
                              {param}
                            </Label>
                            <Input
                              id={`${endpointKey}-${param}`}
                              placeholder={
                                serviceConfig.exampleParams?.[param] ??
                                `Enter ${param}`
                              }
                              value={params[param] ?? ""}
                              onChange={(e) =>
                                updateEndpointParam(
                                  endpointKey,
                                  param,
                                  e.target.value,
                                )
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Status Badge */}
                    {result && result.status !== "idle" && (
                      <Badge
                        variant={
                          result.status === "fail" ? "destructive" : "default"
                        }
                        className={
                          result.status === "running"
                            ? "bg-blue-500"
                            : result.status === "success"
                              ? "bg-green-600"
                              : ""
                        }
                      >
                        {result.status === "running" && "Testing..."}
                        {result.status === "success" &&
                          `${result.statusCode ?? 200} OK`}
                        {result.status === "fail" &&
                          (result.statusCode
                            ? `${result.statusCode} Error`
                            : "Failed")}
                      </Badge>
                    )}

                    {/* Error Message */}
                    {result?.status === "fail" && result.error && (
                      <p className="text-xs text-red-600">{result.error}</p>
                    )}

                    {/* Response Preview */}
                    {result?.status === "success" && result.response && (
                      <div className="min-w-0 overflow-hidden">
                        <JsonViewer
                          data={result.response}
                          maxPreviewHeight="100px"
                        />
                      </div>
                    )}

                    {/* Test Button */}
                    <Button
                      onClick={() => handleTestOne(endpoint)}
                      disabled={result?.status === "running" || isRunningAll}
                      size="sm"
                      className="w-full"
                      variant={
                        result?.status === "success" ? "outline" : "default"
                      }
                    >
                      {result?.status === "running" ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-1 h-3 w-3" />
                          {result?.status === "success" ? "Test Again" : "Test"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
