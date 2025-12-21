"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type Cadence,
  type Period,
  findPeriodForTimestamp,
  getPeriods,
} from "@/lib/metrics/periods";
import { api } from "@/trpc/react";

interface BaseMetricCheckInFormProps {
  metric: {
    id: string;
    name: string;
    endpointConfig: unknown;
    dataPoints: Array<{ timestamp: Date; value: number }>;
    dashboardCharts: Array<{ id: string }>;
  };
  cadence: Cadence;
  role?: {
    id: string;
    title: string;
    team: { id: string; name: string };
  } | null;
  onSuccess?: () => Promise<void>;
}

export function BaseMetricCheckInForm({
  metric,
  cadence,
  role,
  onSuccess,
}: BaseMetricCheckInFormProps) {
  // Get the last 3 periods to display
  const periods = useMemo(() => getPeriods(cadence, 3), [cadence]);

  // Map existing data points to periods
  const existingValues = useMemo(() => {
    const values: Record<string, number | null> = {};
    for (const period of periods) {
      values[period.label] = null;
    }

    for (const dataPoint of metric.dataPoints) {
      const period = findPeriodForTimestamp(
        new Date(dataPoint.timestamp),
        periods,
      );
      if (period) {
        values[period.label] = dataPoint.value;
      }
    }

    return values;
  }, [metric.dataPoints, periods]);

  // Form state for each period
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const period of periods) {
      const existingValue = existingValues[period.label];
      initial[period.label] =
        existingValue !== null ? String(existingValue) : "";
    }
    return initial;
  });

  const [isDirty, setIsDirty] = useState(false);

  // Resync form state when existingValues changes (e.g., after refetch)
  useEffect(() => {
    const synced: Record<string, string> = {};
    for (const period of periods) {
      const existingValue = existingValues[period.label];
      synced[period.label] =
        existingValue !== null ? String(existingValue) : "";
    }
    setValues(synced);
    setIsDirty(false);
  }, [existingValues, periods]);

  const addDataPointsMutation = api.metric.addDataPoints.useMutation();
  const regenerateChartMutation =
    api.transformer.regenerateChartTransformer.useMutation();

  const handleValueChange = useCallback(
    (periodLabel: string, value: string) => {
      setValues((prev) => ({
        ...prev,
        [periodLabel]: value,
      }));
      setIsDirty(true);
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    // Convert form values to data points
    const dataPoints: Array<{ timestamp: Date; value: number }> = [];

    for (const period of periods) {
      const value = values[period.label];
      if (value !== "" && !isNaN(Number(value))) {
        dataPoints.push({
          timestamp: period.timestamp,
          value: Number(value),
        });
      }
    }

    if (dataPoints.length === 0) {
      toast.error("Please enter at least one value");
      return;
    }

    try {
      await addDataPointsMutation.mutateAsync({
        metricId: metric.id,
        dataPoints,
      });

      toast.success("Values saved");
      setIsDirty(false);

      // Regenerate chart using existing pipeline (auto, non-blocking)
      const dashboardChartId = metric.dashboardCharts[0]?.id;
      if (dashboardChartId) {
        regenerateChartMutation.mutate(
          { dashboardChartId },
          {
            onSuccess: () => {
              toast.success("Chart updated", { id: "chart-regen" });
            },
          },
        );
      }

      // Call parent's onSuccess for cache invalidation
      await onSuccess?.();
    } catch (error) {
      toast.error(
        `Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, [
    values,
    periods,
    metric.id,
    metric.dashboardCharts,
    addDataPointsMutation,
    regenerateChartMutation,
    onSuccess,
  ]);

  const config = metric.endpointConfig as {
    type?: string;
    unitType?: string;
    cadence?: string;
  } | null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{metric.name}</CardTitle>
              <Badge variant="outline" className="text-xs uppercase">
                {cadence}
              </Badge>
            </div>
            {role && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <User className="h-3 w-3" />
                <span>{role.title}</span>
                <span className="text-muted-foreground/50">
                  in {role.team.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Period</TableHead>
              <TableHead>
                Value {config?.unitType === "percentage" ? "(%)" : ""}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((period, index) => (
              <PeriodRow
                key={period.label}
                period={period}
                value={values[period.label] ?? ""}
                existingValue={existingValues[period.label] ?? null}
                onChange={(value) => handleValueChange(period.label, value)}
                isCurrent={index === 0}
              />
            ))}
          </TableBody>
        </Table>

        <Button
          onClick={handleSubmit}
          disabled={!isDirty || addDataPointsMutation.isPending}
          className="mt-4 w-full"
          variant="secondary"
        >
          {addDataPointsMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "submit values"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

interface PeriodRowProps {
  period: Period;
  value: string;
  existingValue: number | null;
  onChange: (value: string) => void;
  isCurrent: boolean;
}

function PeriodRow({
  period,
  value,
  existingValue,
  onChange,
  isCurrent,
}: PeriodRowProps) {
  const hasExistingValue = existingValue != null;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {period.label}
        {isCurrent && (
          <span className="text-muted-foreground ml-2 text-xs">(current)</span>
        )}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="any"
          placeholder={hasExistingValue ? undefined : "—"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            hasExistingValue && value === String(existingValue)
              ? "bg-green-50 dark:bg-green-950/20"
              : undefined
          }
        />
      </TableCell>
    </TableRow>
  );
}
