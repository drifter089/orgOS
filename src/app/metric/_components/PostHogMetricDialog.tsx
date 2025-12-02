"use client";

import { MetricDialogBase } from "./MetricDialogBase";
import { PostHogMetricContent } from "./PostHogMetricContent";

interface PostHogMetricDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  teamId?: string;
  connectionId?: string;
}

export function PostHogMetricDialog({
  trigger,
  open,
  onOpenChange,
  onSuccess,
  teamId,
  connectionId,
}: PostHogMetricDialogProps) {
  return (
    <MetricDialogBase
      integrationId="posthog"
      connectionId={connectionId}
      title="Create Event Metric"
      description="Track event occurrences over time from your PostHog project"
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      teamId={teamId}
    >
      {(props) => <PostHogMetricContent {...props} />}
    </MetricDialogBase>
  );
}
