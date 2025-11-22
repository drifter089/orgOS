/**
 * GitHub-specific metric configuration UI
 * Provides integration-specific forms and logic for creating GitHub metrics
 */

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

import { templates } from "./templates";
import { GITHUB_TRANSFORMS } from "./transforms";

/**
 * GitHub-specific metric configuration UI
 * Provides integration-specific forms and logic for creating GitHub metrics
 */

interface GitHubMetricConfigProps {
  connectionId: string;
  templateId: string;
  onSave: (config: {
    name: string;
    endpointParams: Record<string, string>;
  }) => void;
}

export function GitHubMetricConfig({
  connectionId,
  templateId,
  onSave,
}: GitHubMetricConfigProps) {
  const template = templates.find((t) => t.templateId === templateId);
  const [params, setParams] = useState<Record<string, string>>({});
  const [metricName, setMetricName] = useState(template?.label ?? "");

  if (!template) return <div>Template not found</div>;

  // Find if there's a dynamic-select for repos
  const repoParam = template.requiredParams.find(
    (p) => p.type === "dynamic-select" && p.name === "REPO",
  );

  // Fetch repos for dynamic dropdown
  const { data: reposData, isLoading: isLoadingRepos } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId,
        integrationId: "github",
        endpoint: repoParam?.dynamicConfig?.endpoint ?? "",
        method: repoParam?.dynamicConfig?.method ?? "GET",
      },
      {
        enabled: !!repoParam?.dynamicConfig,
      },
    );

  const repoOptions = reposData?.data
    ? GITHUB_TRANSFORMS.repos(reposData.data)
    : [];

  const handleSave = () => {
    onSave({
      name: metricName,
      endpointParams: params,
    });
  };

  const isComplete = template.requiredParams.every(
    (param) => !param.required || params[param.name],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="metric-name">Metric Name</Label>
        <Input
          id="metric-name"
          value={metricName}
          onChange={(e) => setMetricName(e.target.value)}
          placeholder="Metric name"
        />
      </div>

      {template.requiredParams.map((param) => {
        if (param.type === "text") {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Input
                id={param.name}
                value={params[param.name] ?? ""}
                onChange={(e) =>
                  setParams({ ...params, [param.name]: e.target.value })
                }
                placeholder={param.placeholder}
              />
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        if (param.type === "number") {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Input
                id={param.name}
                type="number"
                value={params[param.name] ?? ""}
                onChange={(e) =>
                  setParams({ ...params, [param.name]: e.target.value })
                }
                placeholder={param.placeholder}
              />
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        if (param.type === "dynamic-select" && param.name === "REPO") {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Select
                value={params[param.name]}
                onValueChange={(value) =>
                  setParams({ ...params, [param.name]: value })
                }
                disabled={isLoadingRepos}
              >
                <SelectTrigger id={param.name}>
                  <SelectValue
                    placeholder={
                      isLoadingRepos ? "Loading repositories..." : param.label
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
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        if (param.type === "select" && param.options) {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Select
                value={params[param.name]}
                onValueChange={(value) =>
                  setParams({ ...params, [param.name]: value })
                }
              >
                <SelectTrigger id={param.name}>
                  <SelectValue placeholder={param.label} />
                </SelectTrigger>
                <SelectContent>
                  {param.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        return null;
      })}

      <Button onClick={handleSave} disabled={!isComplete} className="w-full">
        Save Metric
      </Button>
    </div>
  );
}
