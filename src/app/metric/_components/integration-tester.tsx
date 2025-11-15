"use client";

import { useState } from "react";

import { Loader2, PlayCircle } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";

interface ServiceEndpoint {
  label: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  description?: string;
  requiresParams?: boolean;
  params?: string[];
}

export function IntegrationTester() {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null,
  );
  const [selectedEndpoint, setSelectedEndpoint] =
    useState<ServiceEndpoint | null>(null);
  const [endpointParams, setEndpointParams] = useState<Record<string, string>>(
    {},
  );
  const [testResult, setTestResult] = useState<{
    data: unknown;
    status: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all integrations
  const { data: integrationsData } = api.integration.listWithStats.useQuery();

  // Fetch service endpoints when an integration is selected
  const { data: serviceData } = api.metric.getServiceEndpoints.useQuery(
    { integrationId: selectedIntegration ?? "" },
    { enabled: !!selectedIntegration },
  );

  // Test endpoint mutation
  const testMutation = api.metric.testIntegrationEndpoint.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setTestResult(null);
    },
  });

  const activeIntegrations = integrationsData?.active ?? [];

  const handleIntegrationChange = (connectionId: string) => {
    const integration = activeIntegrations.find(
      (i) => i.connectionId === connectionId,
    );
    if (integration) {
      setSelectedIntegration(integration.integrationId);
      setSelectedEndpoint(null);
      setEndpointParams({});
      setTestResult(null);
      setError(null);
    }
  };

  const handleEndpointChange = (endpointPath: string) => {
    const endpoint = serviceData?.endpoints.find(
      (e: ServiceEndpoint) => e.path === endpointPath,
    );
    if (endpoint) {
      setSelectedEndpoint(endpoint);
      setTestResult(null);
      setError(null);

      // Initialize params with example values if available
      if (endpoint.params && serviceData?.exampleParams) {
        const initialParams: Record<string, string> = {};
        endpoint.params.forEach((param) => {
          initialParams[param] =
            (serviceData.exampleParams as Record<string, string> | undefined)?.[
              param
            ] ?? "";
        });
        setEndpointParams(initialParams);
      } else {
        setEndpointParams({});
      }
    }
  };

  const handleTest = () => {
    if (!selectedIntegration || !selectedEndpoint) return;

    const integration = activeIntegrations.find(
      (i) => i.integrationId === selectedIntegration,
    );
    if (!integration) return;

    testMutation.mutate({
      connectionId: integration.connectionId,
      integrationId: selectedIntegration,
      endpoint: selectedEndpoint.path,
      method: selectedEndpoint.method,
      params:
        Object.keys(endpointParams).length > 0 ? endpointParams : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integration Endpoint Tester</CardTitle>
          <CardDescription>
            Test API endpoints from your connected integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Integration Selection */}
          <div className="space-y-2">
            <Label>Select Integration</Label>
            {activeIntegrations.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No active integrations found. Please connect an integration
                  first.
                </AlertDescription>
              </Alert>
            ) : (
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
                      {integration.integrationId} (
                      {integration.connectionId.slice(0, 8)}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Endpoint Selection */}
          {selectedIntegration && serviceData && (
            <div className="space-y-2">
              <Label>Select Endpoint</Label>
              <Select onValueChange={handleEndpointChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an endpoint..." />
                </SelectTrigger>
                <SelectContent>
                  {serviceData.endpoints.map((endpoint: ServiceEndpoint) => (
                    <SelectItem key={endpoint.path} value={endpoint.path}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {endpoint.method}
                        </Badge>
                        <span>{endpoint.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEndpoint && (
                <p className="text-muted-foreground text-sm">
                  {selectedEndpoint.description}
                </p>
              )}
            </div>
          )}

          {/* Parameters */}
          {selectedEndpoint?.requiresParams && selectedEndpoint.params && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-3">
                <Label>Parameters</Label>
                {selectedEndpoint.params.map((param) => (
                  <div key={param} className="space-y-2">
                    <Label htmlFor={param} className="text-sm font-normal">
                      {param}
                    </Label>
                    <Input
                      id={param}
                      placeholder={`Enter ${param}`}
                      value={endpointParams[param] ?? ""}
                      onChange={(e) =>
                        setEndpointParams({
                          ...endpointParams,
                          [param]: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Button */}
          {selectedEndpoint && (
            <>
              <Separator />
              <Button
                onClick={handleTest}
                disabled={testMutation.isPending}
                className="w-full"
                size="lg"
              >
                {testMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Test Endpoint
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Response
              <Badge variant="outline">Status: {testResult.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted max-h-[500px] overflow-auto rounded-lg p-4 text-sm">
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
