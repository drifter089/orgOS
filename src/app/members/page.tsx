import { HydrateClient, api } from "@/trpc/server";

import { MembersPageClient } from "./_components/members-page-client";

export default async function MembersPage() {
  await Promise.all([
    api.organization.getMembers.prefetch(),
    api.dashboard.getDashboardCharts.prefetch(),
  ]);

  return (
    <HydrateClient>
      <MembersPageClient />
    </HydrateClient>
  );
}
