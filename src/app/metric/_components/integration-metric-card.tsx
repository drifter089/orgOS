"use client";

import type { Prisma } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Metric {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  type: string;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  integrationId: string | null;
  metricTemplate: string | null;
  endpointConfig: Prisma.JsonValue;
  lastFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  integration?: {
    connectionId: string;
    integrationId: string;
    status: string;
  } | null;
}

interface IntegrationMetricCardProps {
  metric: Metric;
  onRefresh: (id: string) => void;
  onEdit: (metric: Metric) => void;
  onDelete: (id: string, name: string) => void;
  isRefreshing?: boolean;
  isDeleting?: boolean;
}

export function IntegrationMetricCard({
  metric,
  onRefresh,
  onEdit,
  onDelete,
  isRefreshing,
  isDeleting,
}: IntegrationMetricCardProps) {
  const getMetricColor = (
    current: number | null,
    target: number | null,
    type: string,
  ): string => {
    if (!current || !target) return "text-gray-500";

    const percentage = (current / target) * 100;

    if (type === "duration") {
      // For duration, lower is better
      if (percentage <= 100) return "text-green-600";
      if (percentage <= 120) return "text-yellow-600";
      return "text-red-600";
    } else {
      // For other types, higher is better
      if (percentage >= 100) return "text-green-600";
      if (percentage >= 80) return "text-yellow-600";
      return "text-red-600";
    }
  };

  const formatValue = (
    value: number | null,
    type: string,
    unit?: string | null,
  ): string => {
    if (value === null) return "N/A";

    const formatted = value.toFixed(2);

    if (type === "percentage") {
      return `${formatted}%`;
    }

    if (unit) {
      return `${formatted} ${unit}`;
    }

    return formatted;
  };

  const isIntegrationMetric = metric.integrationId && metric.metricTemplate;

  return (
    <Card
      className={`relative transition-opacity ${isDeleting ? "pointer-events-none opacity-50" : ""}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {metric.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {metric.description ?? "No description"}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {metric.type}
            </Badge>
            {isIntegrationMetric && metric.integration && (
              <Badge
                variant="secondary"
                className="text-xs whitespace-nowrap capitalize"
              >
                {metric.integration.integrationId}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Values */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">Current</span>
            <span
              className={`text-2xl font-bold ${getMetricColor(metric.currentValue, metric.targetValue, metric.type)}`}
            >
              {formatValue(metric.currentValue, metric.type, metric.unit)}
            </span>
          </div>
          {metric.targetValue !== null && (
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Target</span>
              <span className="text-lg">
                {formatValue(metric.targetValue, metric.type, metric.unit)}
              </span>
            </div>
          )}
        </div>

        {/* Last Fetched */}
        {isIntegrationMetric && metric.lastFetchedAt && (
          <div className="text-muted-foreground text-xs">
            Updated {formatDistanceToNow(new Date(metric.lastFetchedAt))} ago
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isIntegrationMetric && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onRefresh(metric.id)}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Refresh
                </>
              )}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onEdit(metric)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(metric.id, metric.name)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
