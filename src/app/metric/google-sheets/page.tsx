"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { GoogleSheetsMetricDialog } from "../_components/GoogleSheetsMetricDialog";

export default function GoogleSheetsMetricsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Sheets Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <GoogleSheetsMetricDialog
          trigger={<Button>Create New Metric</Button>}
        />
      </CardContent>
    </Card>
  );
}
