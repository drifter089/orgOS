import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { HydrateClient, api } from "@/trpc/server";

import { CreateTeamDialog } from "../teams/_components/create-team-dialog";
import { TeamsList } from "../teams/_components/teams-list";
import { CreateOrganization } from "./_components/CreateOrganization";
import { DirectorySyncSection } from "./_components/DirectorySyncSection";
import { OrganizationDetails } from "./_components/OrganizationDetails";

function OrganizationDetailsLoading() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-9 w-28" />
    </div>
  );
}

export default async function OrganizationPage() {
  const orgData = await api.organization.getCurrent();

  // User has no organization - show create form
  if (!orgData) {
    return (
      <HydrateClient>
        <div className="min-h-screen">
          <div className="container mx-auto max-w-7xl px-6 pt-16 pb-8 sm:px-8 sm:pt-20 sm:pb-12 lg:px-12 lg:pt-24 lg:pb-16">
            <CreateOrganization />
          </div>
        </div>
      </HydrateClient>
    );
  }

  // Prefetch data for existing org
  await Promise.all([
    api.organization.getMembers.prefetch(),
    api.team.getAll.prefetch(),
  ]);

  const orgName = orgData.organization.name ?? "Organization";

  return (
    <HydrateClient>
      <div className="min-h-screen">
        <div className="container mx-auto max-w-7xl px-6 pt-16 pb-8 sm:px-8 sm:pt-20 sm:pb-12 lg:px-12 lg:pt-24 lg:pb-16">
          {/* Page Header */}
          <div className="animate-in fade-in slide-in-from-bottom-4 mb-8 space-y-4 duration-500 sm:mb-12">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {orgName}
            </h1>
            <Suspense fallback={<OrganizationDetailsLoading />}>
              <OrganizationDetails />
            </Suspense>
          </div>

          {/* Directory Sync Section */}
          <section className="animate-in fade-in slide-in-from-bottom-4 mb-8 max-w-md delay-75 duration-500">
            <DirectorySyncSection
              hasDirectorySync={orgData.hasDirectorySync}
              directory={orgData.directory}
            />
          </section>

          {/* Teams Section */}
          <section className="animate-in fade-in slide-in-from-bottom-4 space-y-6 delay-100 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Teams
              </h2>
              <div className="shrink-0">
                <CreateTeamDialog />
              </div>
            </div>
            <TeamsList />
          </section>
        </div>
      </div>
    </HydrateClient>
  );
}
