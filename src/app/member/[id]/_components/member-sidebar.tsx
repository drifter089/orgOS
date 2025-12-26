"use client";

import { Briefcase, Target, TrendingUp } from "lucide-react";
import { Link } from "next-transition-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
        <div className="space-y-1 p-2">
          {members.map((member) => {
            const initials =
              member.firstName && member.lastName
                ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                : (member.email?.[0]?.toUpperCase() ?? "U");

            const userName =
              member.firstName && member.lastName
                ? `${member.firstName} ${member.lastName}`
                : (member.email ?? "Member");

            const stats = memberStats?.[member.id];
            const roleCount = stats?.roleCount ?? 0;
            const totalEffort = stats?.totalEffort ?? 0;
            const goalsOnTrack = stats?.goalsOnTrack ?? 0;
            const goalsTotal = stats?.goalsTotal ?? 0;

            const isActive = member.id === currentMemberId;

            return (
              <Link
                key={member.id}
                href={`/member/${member.id}`}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-medium",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{userName}</p>
                  {member.jobTitle && (
                    <p
                      className={cn(
                        "truncate text-xs",
                        isActive
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {member.jobTitle}
                    </p>
                  )}

                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {roleCount > 0 && (
                      <Badge
                        variant={isActive ? "secondary" : "secondary"}
                        className={cn(
                          "gap-0.5 px-1 py-0 text-[10px] font-normal",
                          isActive &&
                            "bg-primary-foreground/20 text-primary-foreground",
                        )}
                      >
                        <Briefcase className="h-2.5 w-2.5" />
                        {roleCount}
                      </Badge>
                    )}
                    {totalEffort > 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-0.5 px-1 py-0 text-[10px] font-normal",
                          isActive &&
                            "border-primary-foreground/30 text-primary-foreground",
                        )}
                      >
                        <TrendingUp className="h-2.5 w-2.5" />
                        {totalEffort}
                      </Badge>
                    )}
                    {goalsTotal > 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-0.5 px-1 py-0 text-[10px] font-normal",
                          isActive &&
                            "border-primary-foreground/30 text-primary-foreground",
                        )}
                      >
                        <Target className="h-2.5 w-2.5" />
                        {goalsOnTrack}/{goalsTotal}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
