"use client";

import { Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { ChartTransformResult } from "./dashboard-metric-card";

interface DashboardMetricSettingsProps {
  title: string;
  description: string | null;
  chartTransform: ChartTransformResult | null;
  hasChartData: boolean;
  integrationId: string | null;
  lastFetchedAt: Date | null;
  isProcessing: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  onRegenerate: () => void;
  onRefresh: () => void;
}

export function DashboardMetricSettings({
  title,
  description,
  chartTransform,
  hasChartData,
  integrationId,
  lastFetchedAt,
  isProcessing,
  prompt,
  onPromptChange,
  onRegenerate,
  onRefresh,
}: DashboardMetricSettingsProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between gap-2 pr-24">
          <CardTitle className="truncate text-lg">Settings</CardTitle>
        </div>
        <div className="space-y-0.5">
          <p className="truncate text-sm font-medium">{title}</p>
          {description && (
            <p className="text-muted-foreground line-clamp-1 text-xs">
              {description}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden pt-0">
        <div className="flex-shrink-0 space-y-1">
          <label className="text-sm font-medium">AI Prompt</label>
          <Input
            placeholder="Try: 'pie chart' or 'by month'"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            disabled={isProcessing}
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isProcessing) {
                onRegenerate();
              }
            }}
          />
          <p className="text-muted-foreground text-xs">
            Describe how you want the chart to be transformed
          </p>
        </div>

        <div className="flex flex-shrink-0 gap-2">
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Regenerate
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={isProcessing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refetch
          </Button>
        </div>

        <div className="flex-1" />

        {lastFetchedAt && (
          <div className="text-muted-foreground flex-shrink-0 border-t pt-2 text-xs">
            Last updated: {new Date(lastFetchedAt).toLocaleString()}
          </div>
        )}

        {integrationId && (
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              {integrationId}
            </Badge>
            {hasChartData && chartTransform && (
              <Badge variant="outline" className="text-xs">
                {chartTransform.chartType}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
