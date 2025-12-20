"use client";

import { useCallback, useMemo, useState } from "react";

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
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type ManualMetricsForUser = RouterOutputs["metric"]["getManualMetricsForUser"];
type MetricWithDataPoints = ManualMetricsForUser["weekly"][number]["metric"];

interface MetricCheckInCardProps {
  metric: MetricWithDataPoints;
  role: {
    id: string;
    title: string;
    team: { id: string; name: string };
  };
  cadence: Cadence;
}

export function MetricCheckInCard({
  metric,
  role,
  cadence,
}: MetricCheckInCardProps) {
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

  const utils = api.useUtils();

  const addDataPointsMutation = api.metric.addDataPoints.useMutation({
    onSuccess: async () => {
      toast.success("Values saved successfully");
      setIsDirty(false);
      await utils.metric.getManualMetricsForUser.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

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

  const handleSubmit = useCallback(() => {
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

    addDataPointsMutation.mutate({
      metricId: metric.id,
      dataPoints,
    });
  }, [values, periods, metric.id, addDataPointsMutation]);

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
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <User className="h-3 w-3" />
              <span>{role.title}</span>
              <span className="text-muted-foreground/50">
                in {role.team.name}
              </span>
            </div>
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
