"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";

import { MemberCard } from "./member-card";

function MemberCardSkeleton() {
  return (
    <div className="border-border/60 bg-card border p-6">
      <div className="flex gap-6">
        <div className="flex w-[220px] shrink-0 flex-col gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-4">
          <Skeleton className="h-[320px] w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      </div>
    </div>
  );
}

export function MembersPageClient() {
  const { data: members, isLoading: membersLoading } =
    api.organization.getMembers.useQuery();
  const { data: dashboardCharts, isLoading: chartsLoading } =
    api.dashboard.getDashboardCharts.useQuery();

  const isLoading = membersLoading || chartsLoading;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-7xl px-6 pt-16 pb-8 sm:px-8 sm:pt-20 sm:pb-12 lg:px-12 lg:pt-24 lg:pb-16">
        <div className="animate-in fade-in slide-in-from-bottom-4 mb-8 duration-500">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Members
          </h1>
          <p className="text-muted-foreground mt-2">
            Overview of all team members and their contributions
          </p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 delay-100 duration-500">
          {isLoading ? (
            <>
              <MemberCardSkeleton />
              <MemberCardSkeleton />
              <MemberCardSkeleton />
            </>
          ) : !members || members.length === 0 ? (
            <div className="border-border/60 text-muted-foreground bg-card flex flex-col items-center justify-center border border-dashed py-16 text-center">
              <h2 className="text-lg font-medium">No members found</h2>
              <p className="mt-1 text-sm">
                Members will appear here once they join the organization.
              </p>
            </div>
          ) : (
            members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                dashboardCharts={dashboardCharts ?? []}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
