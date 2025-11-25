"use client";

import { MetricDialogBase } from "./MetricDialogBase";
import { YouTubeMetricContent } from "./YouTubeMetricContent";

interface YouTubeMetricDialogProps {
  teamId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function YouTubeMetricDialog({
  teamId,
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
      teamId={teamId}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    >
      {(props) => <YouTubeMetricContent {...props} />}
    </MetricDialogBase>
  );
}
