"use client";

import { MembersList } from "@/components/member/member-list";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type RouterOutputs } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];

interface MembersListClientProps {
  members: Member[];
}

export function MembersListClient({ members }: MembersListClientProps) {
  if (!members || members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>
            No members found in this organization.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Organization Members</CardTitle>
            <CardDescription className="text-base">
              View your team members
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 px-3 py-1 text-lg">
            {members.length}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <MembersList members={members} />
      </CardContent>
    </Card>
  );
}
