"use client";

import { Briefcase, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type RouterOutputs } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];

interface MemberHeaderProps {
  member: Member;
  roleCount: number;
  teamCount: number;
}

export function MemberHeader({
  member,
  roleCount,
  teamCount,
}: MemberHeaderProps) {
  const initials =
    member.firstName && member.lastName
      ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
      : (member.email?.[0]?.toUpperCase() ?? "U");

  const userName =
    member.firstName && member.lastName
      ? `${member.firstName} ${member.lastName}`
      : (member.email ?? "Member");

  return (
    <Card>
      <CardContent className="flex items-center gap-6 p-6">
        <Avatar className="h-24 w-24">
          <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{userName}</h1>
            {member.jobTitle && (
              <p className="text-muted-foreground mt-0.5 text-base">
                {member.jobTitle}
              </p>
            )}
            <p className="text-muted-foreground text-sm">{member.email}</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Badge variant="secondary" className="gap-1.5">
              <Briefcase className="h-3 w-3" />
              {roleCount} {roleCount === 1 ? "role" : "roles"}
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Users className="h-3 w-3" />
              {teamCount} {teamCount === 1 ? "team" : "teams"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
