"use client";

import {
  ArrowRight,
  Briefcase,
  FolderSync,
  Gauge,
  Target,
  UserCog,
} from "lucide-react";
import { Link } from "next-transition-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];

export interface MemberStats {
  roleCount: number;
  totalEffort: number;
  goalsOnTrack: number;
  goalsTotal: number;
}

interface MemberCardProps {
  member: Member;
  stats?: MemberStats;
  isActive?: boolean;
  className?: string;
}

function getDisplayInfo(member: Member) {
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

export function MemberCard({
  member,
  stats,
  isActive = false,
  className,
}: MemberCardProps) {
  const { initials, displayName } = getDisplayInfo(member);
  const isDirectory = member.source === "directory" || member.source === "both";

  const roleCount = stats?.roleCount ?? 0;
  const totalEffort = stats?.totalEffort ?? 0;
  const goalsOnTrack = stats?.goalsOnTrack ?? 0;
  const goalsTotal = stats?.goalsTotal ?? 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border p-2.5 transition-colors sm:gap-3 sm:p-3",
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border hover:bg-accent/50",
        className,
      )}
    >
      {/* Top row: Avatar + Info + Badges */}
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0 sm:h-10 sm:w-10">
          {member.profilePictureUrl && (
            <AvatarImage src={member.profilePictureUrl} alt={displayName} />
          )}
          <AvatarFallback
            className={cn(
              "text-[10px] font-medium sm:text-xs",
              isActive
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name + Email + Job Title */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium sm:text-sm">
            {displayName}
          </p>
          <p
            className={cn(
              "truncate text-[10px] sm:text-xs",
              isActive ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {member.email}
          </p>
          {member.jobTitle && (
            <p
              className={cn(
                "mt-0.5 truncate text-[10px] sm:text-xs",
                isActive
                  ? "text-primary-foreground/60"
                  : "text-muted-foreground/80",
              )}
            >
              {member.jobTitle}
            </p>
          )}
        </div>

        {/* Admin + Directory badges - hidden on small screens */}
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          {member.canLogin && (
            <Badge
              variant="outline"
              className={cn(
                "h-5 gap-0.5 px-1 text-[10px] font-normal sm:px-1.5 sm:text-[10px]",
                isActive
                  ? "border-primary-foreground/30 text-primary-foreground"
                  : "border-green-500/50 text-green-600 dark:text-green-400",
              )}
            >
              <UserCog className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Admin</span>
            </Badge>
          )}
          {isDirectory && (
            <Badge
              variant="secondary"
              className={cn(
                "h-5 gap-0.5 px-1 text-[10px] font-normal sm:px-1.5 sm:text-[10px]",
                isActive && "bg-primary-foreground/20 text-primary-foreground",
              )}
            >
              <FolderSync className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Dir</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom row: Stats + Details button */}
      <div className="flex items-center justify-between px-0.5">
        {/* Stats badges - all use outline variant for consistency */}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {roleCount > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "h-5 gap-0.5 px-1.5 text-[10px] font-normal",
                isActive
                  ? "border-primary-foreground/30 text-primary-foreground"
                  : "border-border",
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
                "h-5 gap-0.5 px-1.5 text-[10px] font-normal",
                isActive
                  ? "border-primary-foreground/30 text-primary-foreground"
                  : "border-border",
              )}
            >
              <Gauge className="h-2.5 w-2.5" />
              {totalEffort}
            </Badge>
          )}
          {goalsTotal > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "h-5 gap-0.5 px-1.5 text-[10px] font-normal",
                isActive
                  ? "border-primary-foreground/30 text-primary-foreground"
                  : "border-border",
              )}
            >
              <Target className="h-2.5 w-2.5" />
              {goalsOnTrack}/{goalsTotal}
            </Badge>
          )}
        </div>

        {/* Details button */}
        <Button
          asChild
          variant={isActive ? "secondary" : "outline"}
          size="sm"
          className={cn(
            "group h-6 shrink-0 gap-1 px-2 text-xs transition-all duration-200 hover:scale-[1.02]",
            isActive
              ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
              : "border-border hover:border-primary/50 hover:bg-accent/50",
          )}
        >
          <Link href={`/member/${member.id}`}>
            Details
            <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
