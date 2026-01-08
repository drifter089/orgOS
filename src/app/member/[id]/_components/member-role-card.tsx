"use client";

import { Gauge, TrendingUp, User } from "lucide-react";

import { ReadOnlyMetricCard } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
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
  const truncatedPurpose =
    purpose.length > 100 ? purpose.substring(0, 100) + "..." : purpose;

  return (
    <div
      className="bg-card flex flex-col rounded-lg border transition-all duration-200 hover:shadow-lg"
      style={{ borderColor: role.color }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-2 rounded-t-md px-4 py-2"
        style={{ backgroundColor: `${role.color}15` }}
      >
        <User className="h-5 w-5" style={{ color: role.color }} />
        <h3 className="truncate text-sm font-semibold">{role.title}</h3>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-4 py-2">
        {/* Purpose */}
        {truncatedPurpose && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {truncatedPurpose}
          </p>
        )}

        {/* Metric info when no chart */}
        {!dashboardChart && role.metric && (
          <div className="mt-auto space-y-0.5">
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="text-muted-foreground h-3 w-3 shrink-0" />
              <span className="truncate font-medium">{role.metric.name}</span>
            </div>
            {role.metric.description && (
              <p className="text-muted-foreground/70 pl-5 text-[10px]">
                {role.metric.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer - Effort Points */}
      {role.effortPoints && (
        <div className="border-border/50 shrink-0 border-t px-4 py-1.5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Gauge className="h-3.5 w-3.5" />
            <span>
              {role.effortPoints} {role.effortPoints === 1 ? "point" : "points"}
            </span>
          </div>
        </div>
      )}

      {/* Metric Chart Section */}
      {dashboardChart ? (
        <div className="border-border/50 overflow-hidden border-t">
          <ReadOnlyMetricCard dashboardChart={dashboardChart} />
        </div>
      ) : !role.metric ? (
        <div className="border-border/50 text-muted-foreground border-t px-4 py-3 text-center text-xs">
          No KPI assigned
        </div>
      ) : null}
    </div>
  );
}
