"use client";

import { GitHubMetricContent } from "./GitHubMetricContent";
import { MetricDialogBase } from "./MetricDialogBase";

interface GitHubMetricDialogProps {
  teamId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GitHubMetricDialog({
  teamId,
  trigger,
  open,
  onOpenChange,
  onSuccess,
}: GitHubMetricDialogProps) {
  return (
    <MetricDialogBase
      integrationId="github"
      title="Create Commit History Metric"
      description="Track code additions and deletions for the last 28 days"
      teamId={teamId}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    >
      {(props) => <GitHubMetricContent {...props} />}
    </MetricDialogBase>
  );
}
