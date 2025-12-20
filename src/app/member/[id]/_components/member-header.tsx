"use client";

import { TrendingUp } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type RouterOutputs } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];

interface MemberHeaderProps {
  member: Member;
  totalEffortPoints: number;
}

export function MemberHeader({ member, totalEffortPoints }: MemberHeaderProps) {
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
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{userName}</h1>
          <p className="text-muted-foreground mt-1">{member.email}</p>
          {member.jobTitle && (
            <p className="text-muted-foreground mt-1 text-sm">
              {member.jobTitle}
            </p>
          )}
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-primary h-5 w-5" />
            <span className="text-muted-foreground text-sm">Total Effort</span>
          </div>
          <Badge
            variant="secondary"
            className="mt-2 px-4 py-2 text-2xl font-bold"
          >
            {totalEffortPoints} pts
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
