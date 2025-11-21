"use client";

import type { Prisma } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

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

interface MetricCardProps {
  metric: Metric;
  onEdit: (metric: Metric) => void;
  onDelete: (id: string, name: string) => void;
  isDeleting?: boolean;
}

export function MetricCard({
  metric,
  onEdit,
  onDelete,
  isDeleting,
}: MetricCardProps) {
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
        {/* Last Fetched */}
        {isIntegrationMetric && metric.lastFetchedAt && (
          <div className="text-muted-foreground text-xs">
            Updated {formatDistanceToNow(new Date(metric.lastFetchedAt))} ago
          </div>
        )}

        {/* Template Info */}
        {metric.metricTemplate && (
          <div className="text-muted-foreground text-xs">
            Template: {metric.metricTemplate}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
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
