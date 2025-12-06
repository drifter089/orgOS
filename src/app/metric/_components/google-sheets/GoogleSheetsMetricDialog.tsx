"use client";

import { MetricDialogBase } from "../base/MetricDialogBase";
import { GoogleSheetsMetricContent } from "./GoogleSheetsMetricContent";

interface GoogleSheetsMetricDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  teamId?: string;
  connectionId?: string;
}

export function GoogleSheetsMetricDialog({
  trigger,
  open,
  onOpenChange,
  onSuccess,
  teamId,
  connectionId,
}: GoogleSheetsMetricDialogProps) {
  return (
    <MetricDialogBase
      integrationId="google-sheet"
      connectionId={connectionId}
      title="Create Google Sheets Metric"
      description="Track data from your Google Sheets spreadsheet"
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      teamId={teamId}
      maxWidth="sm:max-w-[900px]"
    >
      {(props) => <GoogleSheetsMetricContent {...props} />}
    </MetricDialogBase>
  );
}
