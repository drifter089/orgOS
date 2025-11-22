"use client";

import { MetricDialogBase } from "./MetricDialogBase";
import { PostHogMetricContent } from "./PostHogMetricContent";

interface PostHogMetricDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PostHogMetricDialog({
  trigger,
  open,
  onOpenChange,
  onSuccess,
}: PostHogMetricDialogProps) {
  return (
    <MetricDialogBase
      integrationId="posthog"
      title="Create Event Metric"
      description="Track event occurrences over time from your PostHog project"
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    >
      {(props) => <PostHogMetricContent {...props} />}
    </MetricDialogBase>
  );
}
