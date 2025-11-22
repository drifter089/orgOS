"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { templates } from "@/lib/integrations/github";
import { api } from "@/trpc/react";

// =============================================================================
// Transform Functions (moved from lib/integrations/github.ts)
// =============================================================================

function transformRepos(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!Array.isArray(data)) return [];
  return data.map(
    (repo: { full_name: string; name: string; private: boolean }) => ({
      label: `${repo.full_name}${repo.private ? " (private)" : ""}`,
      value: repo.name,
    }),
  );
}

// =============================================================================
// GitHub Metrics Creation Page
// =============================================================================

export default function GitHubMetricsPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [metricName, setMetricName] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [repoOptions, setRepoOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);

  const utils = api.useUtils();
  const createMetric = api.metric.create.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      setSelectedTemplateId("");
      setMetricName("");
      setParams({});
      setRepoOptions([]);
    },
  });

  const fetchRepos = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data: { data: unknown }) => {
      const options = transformRepos(data.data);
      setRepoOptions(options);
    },
  });

  const selectedTemplate = templates.find(
    (t) => t.templateId === selectedTemplateId,
  );

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setMetricName("");
    setParams({});
    setRepoOptions([]);
  };

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === "github",
  );

  const handleOwnerChange = (owner: string) => {
    setParams((prev) => ({ ...prev, OWNER: owner }));

    // Fetch repos for this owner if template requires REPO param
    if (
      selectedTemplate?.requiredParams.some((p) => p.name === "REPO") &&
      owner &&
      connection
    ) {
      fetchRepos.mutate({
        connectionId: connection.connectionId,
        integrationId: "github",
        endpoint: "/user/repos?per_page=100&sort=updated",
        method: "GET",
        params: {},
      });
    }
  };

  const handleSave = () => {
    if (!selectedTemplate || !metricName || !connection) return;

    createMetric.mutate({
      templateId: selectedTemplate.templateId,
      connectionId: connection.connectionId,
      name: metricName,
      description: selectedTemplate.description,
      endpointParams: params,
    });
  };

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No GitHub Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Please connect your GitHub account first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create GitHub Metric</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label htmlFor="template">Template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={handleTemplateChange}
          >
            <SelectTrigger id="template">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem
                  key={template.templateId}
                  value={template.templateId}
                >
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <p className="text-muted-foreground text-sm">
              {selectedTemplate.description}
            </p>
          )}
        </div>

        {/* Metric Name */}
        {selectedTemplate && (
          <div className="space-y-2">
            <Label htmlFor="name">Metric Name</Label>
            <Input
              id="name"
              placeholder="e.g., My GitHub Stars"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
            />
          </div>
        )}

        {/* Dynamic Parameters */}
        {selectedTemplate?.requiredParams.map((param) => {
          if (param.type === "text") {
            return (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name}>{param.label}</Label>
                <Input
                  id={param.name}
                  placeholder={param.placeholder}
                  value={params[param.name] ?? ""}
                  onChange={(e) => {
                    if (param.name === "OWNER") {
                      handleOwnerChange(e.target.value);
                    } else {
                      setParams((prev) => ({
                        ...prev,
                        [param.name]: e.target.value,
                      }));
                    }
                  }}
                />
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              </div>
            );
          }

          if (param.type === "dynamic-select" && param.name === "REPO") {
            return (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name}>{param.label}</Label>
                <Select
                  value={params[param.name] ?? ""}
                  onValueChange={(value) =>
                    setParams((prev) => ({ ...prev, [param.name]: value }))
                  }
                  disabled={!params.OWNER || repoOptions.length === 0}
                >
                  <SelectTrigger id={param.name}>
                    <SelectValue
                      placeholder={
                        !params.OWNER
                          ? "Enter owner first"
                          : fetchRepos.isPending
                            ? "Loading..."
                            : param.placeholder
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {repoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              </div>
            );
          }

          return null;
        })}

        {/* Save Button */}
        {selectedTemplate && (
          <Button
            onClick={handleSave}
            disabled={
              !metricName ||
              createMetric.isPending ||
              selectedTemplate.requiredParams.some(
                (p) => p.required && !params[p.name],
              )
            }
          >
            {createMetric.isPending ? "Creating..." : "Create Metric"}
          </Button>
        )}

        {createMetric.isError && (
          <p className="text-destructive text-sm">
            Error: {createMetric.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
