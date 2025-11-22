"use client";

import { MetricDialogBase } from "./MetricDialogBase";
import { YouTubeMetricContent } from "./YouTubeMetricContent";

interface YouTubeMetricDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function YouTubeMetricDialog({
  trigger,
  open,
  onOpenChange,
  onSuccess,
}: YouTubeMetricDialogProps) {
  return (
    <MetricDialogBase
      integrationId="youtube"
      title="Create YouTube Metric"
      description="Track views, likes, and subscribers over time for your channel or specific videos."
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    >
      {(props) => <YouTubeMetricContent {...props} />}
    </MetricDialogBase>
  );
}
