"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { YouTubeMetricDialog } from "../_components/YouTubeMetricDialog";

export default function YouTubeMetricsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>YouTube Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <YouTubeMetricDialog trigger={<Button>Create YouTube Metric</Button>} />
      </CardContent>
    </Card>
  );
}
