"use client";

import { GitHubMetricContent } from "./GitHubMetricContent";
import { MetricDialogBase } from "./MetricDialogBase";

interface GitHubMetricDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  teamId?: string;
  connectionId?: string;
}

export function GitHubMetricDialog({
  trigger,
  open,
  onOpenChange,
  onSuccess,
  teamId,
  connectionId,
}: GitHubMetricDialogProps) {
  return (
    <MetricDialogBase
      integrationId="github"
      connectionId={connectionId}
      title="Create Commit History Metric"
      description="Track code additions and deletions for the last 28 days"
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      teamId={teamId}
    >
      {(props) => <GitHubMetricContent {...props} />}
    </MetricDialogBase>
  );
}
