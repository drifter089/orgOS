"use client";

import { MetricDialogBase } from "./MetricDialogBase";
import { YouTubeMetricContent } from "./YouTubeMetricContent";

interface YouTubeMetricDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  teamId?: string;
  connectionId?: string;
}

export function YouTubeMetricDialog({
  trigger,
  open,
  onOpenChange,
  onSuccess,
  teamId,
  connectionId,
}: YouTubeMetricDialogProps) {
  return (
    <MetricDialogBase
      integrationId="youtube"
      connectionId={connectionId}
      title="Create YouTube Metric"
      description="Track views, likes, and subscribers over time for your channel or specific videos."
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      teamId={teamId}
    >
      {(props) => <YouTubeMetricContent {...props} />}
    </MetricDialogBase>
  );
}
