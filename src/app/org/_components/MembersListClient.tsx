"use client";

import { MembersPanel } from "@/components/member/member-list";
import { Card } from "@/components/ui/card";
import { type RouterOutputs } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];

interface MembersListClientProps {
  members: Member[];
}

export function MembersListClient({ members }: MembersListClientProps) {
  return (
    <Card className="h-[600px] overflow-hidden">
      <MembersPanel members={members} />
    </Card>
  );
}
