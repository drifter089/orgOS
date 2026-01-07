"use client";

import { MemberCard } from "@/components/member/member-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type RouterOutputs, api } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];

interface MemberSidebarProps {
  members: Member[];
  currentMemberId: string;
}

export function MemberSidebar({
  members,
  currentMemberId,
}: MemberSidebarProps) {
  const { data: memberStats } = api.organization.getMemberStats.useQuery();

  return (
    <div className="bg-card sticky top-20 h-[calc(100vh-6rem)] rounded-lg border">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Team Members</h2>
        <p className="text-muted-foreground text-sm">
          {members.length} {members.length === 1 ? "member" : "members"}
        </p>
      </div>

      <ScrollArea className="h-[calc(100%-5rem)]">
        <div className="space-y-2 p-2">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              stats={memberStats?.[member.id]}
              isActive={member.id === currentMemberId}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
