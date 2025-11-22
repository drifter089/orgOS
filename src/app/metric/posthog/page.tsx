"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { PostHogMetricDialog } from "../_components/PostHogMetricDialog";

export default function PostHogMetricsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>PostHog Event Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <PostHogMetricDialog trigger={<Button>Create Event Metric</Button>} />
      </CardContent>
    </Card>
  );
}
