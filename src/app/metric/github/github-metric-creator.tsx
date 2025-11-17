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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";

interface GitHubMetricCreatorProps {
  connectionId: string;
  onSuccess?: () => void;
}

type MetricTemplateId =
  | "github-followers-count"
  | "github-repos-count"
  | "github-stars-total";

export function GitHubMetricCreator({
  connectionId,
  onSuccess,
}: GitHubMetricCreatorProps) {
  const [templateId, setTemplateId] = useState<MetricTemplateId>(
    "github-followers-count",
  );
  const [metricName, setMetricName] = useState("");
  const [targetValue, setTargetValue] = useState("");

  // Create metric mutation
  const createMutation = api.metric.createFromTemplate.useMutation({
    onSuccess: () => {
      setMetricName("");
      setTargetValue("");
      onSuccess?.();
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      templateId,
      connectionId,
      name: metricName || undefined,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
    });
  };

  const getMetricInfo = () => {
    switch (templateId) {
      case "github-followers-count":
        return {
          title: "GitHub Followers",
          description: "Track your total number of GitHub followers",
        };
      case "github-repos-count":
        return {
          title: "Public Repositories",
          description: "Track your total count of public repositories",
        };
      case "github-stars-total":
        return {
          title: "Repository Stars",
          description: "Track total stars across all your repositories",
        };
    }
  };

  const info = getMetricInfo();

  return (
    <div className="space-y-6">
      {/* Metric Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select GitHub Metric</CardTitle>
          <CardDescription>
            Choose which GitHub metric you want to track
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={templateId}
            onValueChange={(v) => setTemplateId(v as MetricTemplateId)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="github-followers-count">
                Followers
              </TabsTrigger>
              <TabsTrigger value="github-repos-count">Repositories</TabsTrigger>
              <TabsTrigger value="github-stars-total">Stars</TabsTrigger>
            </TabsList>

            <TabsContent value={templateId} className="space-y-2 pt-4">
              <h4 className="font-medium">{info.title}</h4>
              <p className="text-muted-foreground text-sm">
                {info.description}
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Metric Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configure Metric</CardTitle>
          <CardDescription>
            Customize your metric name and target value
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metric-name">Metric Name (Optional)</Label>
            <Input
              id="metric-name"
              placeholder="Leave empty to use default name"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target">Target Value (Optional)</Label>
            <Input
              id="target"
              type="number"
              step="0.01"
              placeholder="e.g., 1000"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? "Creating..." : "Create Metric"}
          </Button>

          {createMutation.isError && (
            <p className="text-sm text-red-600">
              {createMutation.error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
