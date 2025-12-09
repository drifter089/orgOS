"use client";

import { MetricDialogBase } from "../base/MetricDialogBase";
import { LinearMetricContent } from "./LinearMetricContent";

interface LinearMetricDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  teamId?: string;
  connectionId?: string;
}

export function LinearMetricDialog({
  trigger,
  open,
  onOpenChange,
  onSuccess,
  teamId,
  connectionId,
}: LinearMetricDialogProps) {
  return (
    <MetricDialogBase
      integrationId="linear"
      connectionId={connectionId}
      title="Create Linear Metric"
      description="Track your Linear issues and productivity over time"
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      teamId={teamId}
    >
      {(props) => <LinearMetricContent {...props} />}
    </MetricDialogBase>
  );
}
