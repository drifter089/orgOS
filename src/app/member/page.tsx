import { HydrateClient, api } from "@/trpc/server";

import { MembersPageClient } from "./members-page-client";

export default async function MemberPage() {
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
