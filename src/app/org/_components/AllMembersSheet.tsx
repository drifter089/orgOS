"use client";

import { Users } from "lucide-react";

import { MembersPanel } from "@/components/member/member-list";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { type RouterOutputs, api } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];

interface AllMembersSheetProps {
  members: Member[];
}

export function AllMembersSheet({ members }: AllMembersSheetProps) {
  const totalMembers = members.length;
  const { data: memberStats } = api.organization.getMemberStats.useQuery();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-[130px] gap-2 font-semibold">
          <Users className="h-4 w-4" />
          {totalMembers} {totalMembers === 1 ? "Member" : "Members"}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-hidden p-0 sm:max-w-[40rem]">
        <SheetTitle className="sr-only">Members</SheetTitle>
        <MembersPanel members={members} memberStats={memberStats} />
      </SheetContent>
    </Sheet>
  );
}
