import { User } from "lucide-react";

import { api } from "@/trpc/server";

import { AllMembersSheet } from "./AllMembersSheet";

export async function OrganizationDetails() {
  const [orgData, members] = await Promise.all([
    api.organization.getCurrent(),
    api.organization.getMembers(),
  ]);

  // Prefetch member stats for the sheet
  void api.organization.getMemberStats.prefetch();

  if (!orgData) {
    return null;
  }

  const { currentUser } = orgData;

  const userName =
    currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : (currentUser?.email ?? "Member");

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-full">
          <User className="text-primary h-4 w-4" />
        </div>
        <span className="text-muted-foreground text-sm">
          Signed in as{" "}
          <span className="text-foreground font-medium">{userName}</span>
        </span>
      </div>
      <AllMembersSheet members={members} />
    </div>
  );
}
