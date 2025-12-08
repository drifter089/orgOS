"use client";

import { useEffect, useState } from "react";

import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";

import type { ChartTransformResult } from "./dashboard-metric-card";

interface DashboardMetricSettingsProps {
  metricId: string;
  metricName: string;
  metricDescription: string | null;
  chartTransform: ChartTransformResult | null;
  hasChartData: boolean;
  integrationId: string | null;
  lastFetchedAt: Date | null;
  lastError: string | null;
  pollFrequency: string;
  isProcessing: boolean;
  isUpdating: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  onRegenerate: () => void;
  onRefresh: () => void;
  onUpdateMetric: (name: string, description: string) => void;
}

// Helper to format poll frequency
function formatPollFrequency(frequency: string): string {
  const labels: Record<string, string> = {
    frequent: "Every 15 min",
    hourly: "Hourly",
    daily: "Daily",
    weekly: "Weekly",
    manual: "Manual",
  };
  return labels[frequency] ?? frequency;
}

export function DashboardMetricSettings({
  metricName,
  metricDescription,
  chartTransform,
  hasChartData,
  integrationId,
  lastFetchedAt,
  lastError,
  pollFrequency,
  isProcessing,
  isUpdating,
  prompt,
  onPromptChange,
  onRegenerate,
  onRefresh,
  onUpdateMetric,
}: DashboardMetricSettingsProps) {
  const [name, setName] = useState(metricName);
  const [description, setDescription] = useState(metricDescription ?? "");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setName(metricName);
    setDescription(metricDescription ?? "");
  }, [metricName, metricDescription]);

  useEffect(() => {
    const nameChanged = name !== metricName;
    const descChanged = description !== (metricDescription ?? "");
    setHasChanges(nameChanged || descChanged);
  }, [name, description, metricName, metricDescription]);

  const handleSave = () => {
    if (hasChanges && name.trim()) {
      onUpdateMetric(name.trim(), description.trim());
    }
  };

  const platformConfig = integrationId
    ? getPlatformConfig(integrationId)
    : null;
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="shrink-0 text-base">Settings</CardTitle>
          {platformConfig && (
            <Badge
              className={cn(
                "shrink-0 text-xs",
                platformConfig.bgColor,
                platformConfig.textColor,
              )}
            >
              {platformConfig.name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-0">
        {/* Name with save button */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Metric name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isUpdating}
            className="h-8 min-w-0 flex-1 text-sm"
          />
          <Button
            variant={hasChanges ? "default" : "outline"}
            size="icon"
            onClick={handleSave}
            disabled={!hasChanges || !name.trim() || isUpdating}
            className="h-8 w-8 shrink-0"
          >
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Description */}
        <Input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isUpdating}
          className="h-8 text-xs"
        />

        {/* AI Prompt */}
        <Textarea
          placeholder="AI prompt: 'pie chart', 'by month', 'show trends'..."
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          disabled={isProcessing}
          className="min-h-[80px] flex-1 resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
              e.preventDefault();
              onRegenerate();
            }
          }}
        />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Regenerate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isProcessing}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refetch
          </Button>
        </div>

        {/* Status Info */}
        <div className="mt-auto flex shrink-0 flex-col gap-1.5 border-t pt-2">
          {/* Error indicator */}
          {lastError && (
            <div className="text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate text-xs">{lastError}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[300px]">
                  <p className="text-sm">{lastError}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Footer row with timestamps and badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Last updated */}
              {lastFetchedAt && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(lastFetchedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">
                      Last updated: {new Date(lastFetchedAt).toLocaleString()}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Poll frequency badge */}
              <Badge variant="secondary" className="text-xs">
                {formatPollFrequency(pollFrequency)}
              </Badge>
            </div>

            {/* Chart type badge */}
            {hasChartData && chartTransform && (
              <Badge variant="outline" className="text-xs">
                {chartTransform.chartType}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
