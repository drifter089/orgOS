"use client";

import {
  Briefcase,
  ExternalLink,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "next-transition-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      <SheetContent className="w-full overflow-y-auto px-6 sm:max-w-lg">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-2xl font-bold">Members</SheetTitle>
          <SheetDescription>
            {totalMembers} {totalMembers === 1 ? "member" : "members"} in your
            organization
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 pb-6">
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

            return (
              <div
                key={member.id}
                className="group border-border bg-card hover:bg-accent/30 relative flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{userName}</p>
                    {member.jobTitle && (
                      <p className="text-muted-foreground truncate text-xs">
                        {member.jobTitle}
                      </p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {roleCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="gap-1 px-1.5 py-0 text-xs font-normal"
                        >
                          <Briefcase className="h-3 w-3" />
                          {roleCount} {roleCount === 1 ? "role" : "roles"}
                        </Badge>
                      )}
                      {totalEffort > 0 && (
                        <Badge
                          variant="outline"
                          className="gap-1 px-1.5 py-0 text-xs font-normal"
                        >
                          <TrendingUp className="h-3 w-3" />
                          {totalEffort} pts
                        </Badge>
                      )}
                      {goalsTotal > 0 && (
                        <Badge
                          variant="outline"
                          className="gap-1 px-1.5 py-0 text-xs font-normal"
                        >
                          <Target className="h-3 w-3" />
                          {goalsOnTrack}/{goalsTotal} goals
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      asChild
                    >
                      <Link href={`/member/${member.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>View member details</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
