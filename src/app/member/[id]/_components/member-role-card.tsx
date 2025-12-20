"use client";

import { TrendingUp } from "lucide-react";

import { DashboardMetricCard } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stripHtml } from "@/lib/html-utils";
import { type RouterOutputs } from "@/trpc/react";

type Role = RouterOutputs["role"]["getByUser"][number];
type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];

interface MemberRoleCardProps {
  role: Role;
  dashboardChart?: DashboardMetrics[number];
}

export function MemberRoleCard({ role, dashboardChart }: MemberRoleCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="border-background h-3 w-3 rounded-full border-2 shadow-sm"
              style={{
                backgroundColor: role.color,
                boxShadow: `0 0 0 1px ${role.color}40`,
              }}
            />
            <CardTitle className="text-lg">{role.title}</CardTitle>
          </div>
          {role.effortPoints && (
            <Badge variant="secondary" className="font-semibold">
              {role.effortPoints} pts
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
          {stripHtml(role.purpose ?? "")}
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        {dashboardChart ? (
          <div className="overflow-hidden rounded-lg border">
            <DashboardMetricCard dashboardMetric={dashboardChart} />
          </div>
        ) : role.metric ? (
          <div className="bg-muted/50 space-y-2 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary h-4 w-4" />
              <span className="text-sm font-medium">
                KPI: {role.metric.name}
              </span>
            </div>
            {role.metric.description && (
              <p className="text-muted-foreground text-xs">
                {role.metric.description}
              </p>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground py-4 text-center text-sm">
            No KPI assigned to this role
          </div>
        )}
      </CardContent>
    </Card>
  );
}
