"use client";

import { ClipboardCheck } from "lucide-react";
import { Link } from "next-transition-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { type RouterOutputs } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];

interface MemberHeaderProps {
  member: Member;
}

export function MemberHeader({ member }: MemberHeaderProps) {
  const initials =
    member.firstName && member.lastName
      ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
      : (member.email?.[0]?.toUpperCase() ?? "U");

  const userName =
    member.firstName && member.lastName
      ? `${member.firstName} ${member.lastName}`
      : (member.email ?? "Member");

  return (
    <div className="border-border/60 bg-card flex h-full items-center gap-4 border p-4">
      <Avatar className="h-16 w-16 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="truncate text-2xl font-bold tracking-tight">
          {userName}
        </h1>
        {member.jobTitle && (
          <p className="text-muted-foreground truncate text-sm">
            {member.jobTitle}
          </p>
        )}
        <p className="text-muted-foreground truncate text-xs">{member.email}</p>
      </div>

      <Link href={`/check-in/${member.id}`} className="shrink-0">
        <Button variant="default" size="sm" className="gap-1.5">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Check-in
        </Button>
      </Link>
    </div>
  );
}
