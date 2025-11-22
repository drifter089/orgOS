"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { GitHubMetricDialog } from "../_components/GitHubMetricDialog";

export default function GitHubMetricsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub Commit History</CardTitle>
      </CardHeader>
      <CardContent>
        <GitHubMetricDialog trigger={<Button>Add Metric</Button>} />
      </CardContent>
    </Card>
  );
}
