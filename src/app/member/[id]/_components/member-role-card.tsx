"use client";

import { TrendingUp } from "lucide-react";

import { DashboardMetricCard } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
import { stripHtml } from "@/lib/html-utils";
import { type RouterOutputs } from "@/trpc/react";

type Role = RouterOutputs["role"]["getByUser"][number];
type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];

interface MemberRoleCardProps {
  role: Role;
  dashboardChart?: DashboardMetrics[number];
}

export function MemberRoleCard({ role, dashboardChart }: MemberRoleCardProps) {
  const purpose = stripHtml(role.purpose ?? "");

  return (
    <div className="border-border/60 hover:border-border bg-card flex flex-col border transition-colors">
      <div className="flex items-start justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 shrink-0"
            style={{ backgroundColor: role.color }}
          />
          <span className="font-semibold">{role.title}</span>
        </div>
        {role.effortPoints && (
          <span className="bg-muted text-muted-foreground shrink-0 px-1.5 py-0.5 text-xs font-medium">
            {role.effortPoints} pts
          </span>
        )}
      </div>

      {purpose && (
        <div className="border-border/60 border-t px-4 py-2">
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {purpose}
          </p>
        </div>
      )}

      <div className="border-border/60 mt-auto border-t">
        {dashboardChart ? (
          <div className="overflow-hidden">
            <DashboardMetricCard dashboardMetric={dashboardChart} />
          </div>
        ) : role.metric ? (
          <div className="bg-muted/30 flex items-center gap-2 px-4 py-3">
            <TrendingUp className="text-primary h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {role.metric.name}
              </span>
              {role.metric.description && (
                <span className="text-muted-foreground block truncate text-xs">
                  {role.metric.description}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground px-4 py-3 text-center text-xs">
            No KPI assigned
          </div>
        )}
      </div>
    </div>
  );
}
