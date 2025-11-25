"use client";

import { GoogleSheetsMetricContent } from "./GoogleSheetsMetricContent";
import { MetricDialogBase } from "./MetricDialogBase";

interface GoogleSheetsMetricDialogProps {
  teamId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GoogleSheetsMetricDialog({
  teamId,
  trigger,
  open,
  onOpenChange,
  onSuccess,
}: GoogleSheetsMetricDialogProps) {
  return (
    <MetricDialogBase
      integrationId="google-sheet"
      title="Create Google Sheets Metric"
      description="Track data from your Google Sheets spreadsheet"
      teamId={teamId}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      maxWidth="sm:max-w-[900px]"
    >
      {(props) => <GoogleSheetsMetricContent {...props} />}
    </MetricDialogBase>
  );
}
