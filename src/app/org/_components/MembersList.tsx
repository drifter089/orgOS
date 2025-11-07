import { api } from "@/trpc/server";

import { MembersListClient } from "./MembersListClient";

export async function MembersList() {
  const members = await api.organization.getCurrentOrgMembers();

  // Prefetch roles for all members in parallel
  // This populates the TanStack Query cache so dialogs open instantly
  await Promise.all(
    members.map((member) =>
      api.role.getByUser.prefetch({ userId: member.user.id }),
    ),
  );

  return <MembersListClient members={members} />;
}
