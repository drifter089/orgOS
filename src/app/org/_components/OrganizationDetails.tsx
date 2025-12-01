import { User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/server";

import { AllMembersSheet } from "./AllMembersSheet";

export async function OrganizationDetails() {
  const [orgData, members] = await Promise.all([
    api.organization.getCurrent(),
    api.organization.getCurrentOrgMembers(),
  ]);

  if (!orgData) {
    return null;
  }

  const { membership, currentUser } = orgData;

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
        <Badge variant="secondary" className="text-xs capitalize">
          {membership.role.slug}
        </Badge>
      </div>
      <AllMembersSheet members={members} />
    </div>
  );
}
