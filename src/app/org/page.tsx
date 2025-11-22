import { Suspense } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HydrateClient, api } from "@/trpc/server";

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
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
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
          <section className="animate-in fade-in slide-in-from-bottom-4 delay-100 duration-500">
            <Suspense fallback={<OrganizationDetailsLoading />}>
              <OrganizationDetails />
            </Suspense>
          </section>
        </div>
      </div>
    </HydrateClient>
  );
}
