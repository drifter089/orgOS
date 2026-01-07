"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { ExternalLink, X } from "lucide-react";
import { Link } from "next-transition-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";

import { MemberCard } from "./member-card";

type Member = RouterOutputs["organization"]["getMembers"][number];
type MemberStats = RouterOutputs["organization"]["getMemberStats"];

export function getMemberDisplayInfo(member: Member) {
  const initials =
    member.firstName && member.lastName
      ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
      : (member.email?.[0]?.toUpperCase() ?? "U");

  const displayName =
    member.firstName && member.lastName
      ? `${member.firstName} ${member.lastName}`
      : (member.email ?? "Member");

  return { initials, displayName };
}

interface MembersListProps {
  members: Member[];
  memberStats?: MemberStats;
  className?: string;
}

export function MembersList({
  members,
  memberStats,
  className,
}: MembersListProps) {
  if (!members || members.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center border border-dashed py-8 text-center">
        <p className="text-sm font-medium">No members found</p>
        <p className="text-xs">Members will appear here once added</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          stats={memberStats?.[member.id]}
        />
      ))}
    </div>
  );
}

interface MembersPanelProps {
  members: Member[];
  memberStats?: MemberStats;
  title?: string;
  className?: string;
}

export function MembersPanel({
  members,
  memberStats,
  title = "Members",
  className,
}: MembersPanelProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-xs">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/member">
              View All
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </Link>
          </Button>
          <SheetPrimitive.Close asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </SheetPrimitive.Close>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <MembersList members={members} memberStats={memberStats} />
      </div>
    </div>
  );
}
