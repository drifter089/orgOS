"use client";

import { api } from "@/trpc/react";

import { CadenceSection } from "./cadence-section";

interface CheckInClientProps {
  userId: string;
}

export function CheckInClient({ userId }: CheckInClientProps) {
  const { data, isLoading, error } = api.manualMetric.getForUser.useQuery({
    userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
          <div className="bg-muted h-4 w-64 animate-pulse rounded" />
        </div>
        <div className="bg-muted h-48 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-destructive">Failed to load metrics</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    );
  }

  const hasMetrics =
    data &&
    (data.daily.length > 0 ||
      data.weekly.length > 0 ||
      data.monthly.length > 0);

  if (!hasMetrics) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">No manual metrics assigned</h2>
        <p className="text-muted-foreground mt-2">
          You don&apos;t have any manual metrics assigned to you yet.
          <br />
          Ask your team lead to assign metrics to your roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">check-in</h1>
        <p className="text-muted-foreground">
          update your manual metrics for this period
        </p>
      </div>

      {/* Cadence sections */}
      {data.daily.length > 0 && (
        <CadenceSection
          title="daily check-in"
          cadence="daily"
          metrics={data.daily}
        />
      )}

      {data.weekly.length > 0 && (
        <CadenceSection
          title="weekly check-in"
          cadence="weekly"
          metrics={data.weekly}
        />
      )}

      {data.monthly.length > 0 && (
        <CadenceSection
          title="monthly check-in"
          cadence="monthly"
          metrics={data.monthly}
        />
      )}
    </div>
  );
}
