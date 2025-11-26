"use client";

import { BarChart3, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";

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
  isPending: boolean;
  isProcessing: boolean;
  isRemoving: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  onFlip: () => void;
  onRemove: () => void;
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
  isPending,
  isProcessing,
  isRemoving,
  prompt,
  onPromptChange,
  onFlip,
  onRemove,
  onRegenerate,
  onRefresh,
}: DashboardMetricSettingsProps) {
  return (
    <Card
      className="absolute inset-0 flex flex-col"
      style={{
        backfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
      }}
    >
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="truncate text-lg">Settings</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onFlip}
              className="h-8 w-8 flex-shrink-0"
              title="Back to chart"
            >
              <BarChart3 className="text-muted-foreground hover:text-foreground h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              disabled={isPending || isRemoving}
              className="h-8 w-8 flex-shrink-0"
              title="Remove from dashboard"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="text-muted-foreground hover:text-destructive h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col space-y-4 pt-0">
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
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

          <div className="flex gap-2">
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
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isProcessing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refetch
            </Button>
          </div>
        </div>

        {lastFetchedAt && (
          <div className="text-muted-foreground border-t pt-3 text-xs">
            Last updated: {new Date(lastFetchedAt).toLocaleString()}
          </div>
        )}

        {integrationId && (
          <div className="flex flex-wrap gap-2">
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
