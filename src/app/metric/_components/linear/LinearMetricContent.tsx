"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMetricOptionsForUI, getTemplate } from "@/lib/integrations";
import { api } from "@/trpc/react";

import type { ContentProps } from "../base/MetricDialogBase";

interface SelectOption {
  label: string;
  value: string;
}

const METRIC_OPTIONS = getMetricOptionsForUI("linear");

interface LinearUser {
  id: string;
  name: string;
  email?: string;
  active?: boolean;
}

interface LinearProject {
  id: string;
  name: string;
  state?: string;
}

interface LinearTeam {
  id: string;
  name: string;
  key?: string;
}

function transformUsers(data: unknown): SelectOption[] {
  if (!data || typeof data !== "object") return [];
  const graphqlData = data as { data?: { users?: { nodes?: LinearUser[] } } };
  const nodes = graphqlData.data?.users?.nodes;
  if (!Array.isArray(nodes)) return [];

  return nodes
    .filter((user) => user.active !== false)
    .map((user) => ({
      label: user.email ? `${user.name} (${user.email})` : user.name,
      value: user.id,
    }));
}

function transformProjects(data: unknown): SelectOption[] {
  if (!data || typeof data !== "object") return [];
  const graphqlData = data as {
    data?: { projects?: { nodes?: LinearProject[] } };
  };
  const nodes = graphqlData.data?.projects?.nodes;
  if (!Array.isArray(nodes)) return [];

  return nodes.map((project) => ({
    label: project.state ? `${project.name} (${project.state})` : project.name,
    value: project.id,
  }));
}

function transformTeams(data: unknown): SelectOption[] {
  if (!data || typeof data !== "object") return [];
  const graphqlData = data as { data?: { teams?: { nodes?: LinearTeam[] } } };
  const nodes = graphqlData.data?.teams?.nodes;
  if (!Array.isArray(nodes)) return [];

  return nodes.map((team) => ({
    label: team.key ? `${team.name} (${team.key})` : team.name,
    value: team.id,
  }));
}

function getTemplateId(metricType: string): string {
  return `linear-${metricType}`;
}

function getMetricDescription(metricType: string): string {
  return METRIC_OPTIONS.find((m) => m.value === metricType)?.description ?? "";
}

export function LinearMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [metricType, setMetricType] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [metricName, setMetricName] = useState("");

  const template = useMemo(
    () => (metricType ? getTemplate(`linear-${metricType}`) : null),
    [metricType],
  );

  const paramInfo = template?.requiredParams[0];
  const paramName = paramInfo?.name ?? "";
  const paramLabel = paramInfo?.label ?? "";

  const dropdownQuery = useMemo(() => {
    const body = paramInfo?.dynamicConfig?.body;
    return typeof body === "string" ? body : null;
  }, [paramInfo]);

  // Fetch dropdown options
  const { data: dropdownData, isLoading: isLoadingOptions } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "linear",
        endpoint: "/graphql",
        method: "POST",
        body: dropdownQuery!,
      },
      {
        enabled: !!connection && !!dropdownQuery,
        staleTime: 5 * 60 * 1000,
      },
    );

  // Transform data based on metric type
  const options = useMemo((): SelectOption[] => {
    if (!dropdownData?.data) return [];

    switch (metricType) {
      case "user-issues":
        return transformUsers(dropdownData.data);
      case "project-issues":
        return transformProjects(dropdownData.data);
      case "team-issues":
        return transformTeams(dropdownData.data);
      default:
        return [];
    }
  }, [dropdownData, metricType]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === selectedValue),
    [options, selectedValue],
  );

  // Reset selection when metric type changes
  useEffect(() => {
    setSelectedValue("");
  }, [metricType]);

  // Auto-generate metric name
  useEffect(() => {
    if (!metricType || !selectedOption) {
      setMetricName("");
      return;
    }

    const metricLabel =
      METRIC_OPTIONS.find((m) => m.value === metricType)?.label ?? "";
    // Extract just the name part (before any parentheses)
    const entityName = selectedOption.label.split(" (")[0];
    setMetricName(`${entityName} - ${metricLabel}`);
  }, [metricType, selectedOption]);

  const handleSave = () => {
    if (!metricName || !metricType || !selectedValue || !paramName) return;

    const templateId = getTemplateId(metricType);

    void onSubmit({
      templateId,
      connectionId: connection.connectionId,
      name: metricName,
      description: getMetricDescription(metricType),
      endpointParams: {
        [paramName]: selectedValue,
      },
    });
  };

  const isFormValid = !!metricType && !!selectedValue && !!metricName;

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="metric-type">Metric Type</Label>
          <Select value={metricType} onValueChange={setMetricType}>
            <SelectTrigger id="metric-type">
              <SelectValue placeholder="Select what to track" />
            </SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {metricType && (
            <p className="text-muted-foreground text-sm">
              {getMetricDescription(metricType)}
            </p>
          )}
        </div>

        {metricType && paramLabel && (
          <div className="space-y-2">
            <Label htmlFor="selection">{paramLabel}</Label>
            <Select
              value={selectedValue}
              onValueChange={setSelectedValue}
              disabled={isLoadingOptions || options.length === 0}
            >
              <SelectTrigger id="selection">
                <SelectValue
                  placeholder={
                    isLoadingOptions
                      ? "Loading..."
                      : `Select ${paramLabel.toLowerCase()}`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {metricType && selectedValue && (
          <div className="space-y-2">
            <Label htmlFor="name">Metric Name</Label>
            <Input
              id="name"
              placeholder="e.g., John's Issues"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleSave} disabled={!isFormValid || isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Metric"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
