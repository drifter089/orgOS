import { api } from "@/trpc/server";

import { MembersListClient } from "./MembersListClient";

export async function MembersList() {
  const members = await api.organization.getCurrentOrgMembers();

  return <MembersListClient members={members} />;
}
