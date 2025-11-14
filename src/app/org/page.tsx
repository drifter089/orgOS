import { Suspense } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { HydrateClient, api } from "@/trpc/server";

import { MembersList } from "./_components/MembersList";
import { OrganizationDetails } from "./_components/OrganizationDetails";

// Loading skeleton for organization details
function OrganizationDetailsLoading() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for members list
function MembersListLoading() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-5 w-72" />
          </div>
          <Skeleton className="h-8 w-12 rounded-full" />
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Summary stats skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 rounded-lg border p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function OrganizationPage() {
  // Prefetch all organization data on the server
  // This will populate the TanStack Query cache before hydration
  await Promise.all([
    api.organization.getCurrent.prefetch(),
    api.organization.getCurrentOrgMembers.prefetch(),
  ]);

  return (
    <HydrateClient>
      <div className="min-h-screen">
        <div className="container mx-auto max-w-7xl px-6 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
          {/* Page Header with animation */}
          <div className="animate-in fade-in slide-in-from-bottom-4 mb-8 space-y-2 duration-500 sm:mb-12">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Organization
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              View and manage your organization details and members
            </p>
          </div>

          {/* Organization Details Section */}
          <section className="animate-in fade-in slide-in-from-bottom-4 mb-8 delay-100 duration-500">
            <h2 className="mb-4 text-xl font-semibold sm:mb-6 sm:text-2xl">
              Details
            </h2>
            <Suspense fallback={<OrganizationDetailsLoading />}>
              <OrganizationDetails />
            </Suspense>
          </section>

          {/* Members List Section */}
          <section className="animate-in fade-in slide-in-from-bottom-4 mb-8 delay-200 duration-500">
            <Suspense fallback={<MembersListLoading />}>
              <MembersList />
            </Suspense>
          </section>
        </div>
      </div>
    </HydrateClient>
  );
}
