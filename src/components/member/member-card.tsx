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
        "flex flex-col gap-3 border p-3 transition-colors",
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border hover:bg-accent/50",
        className,
      )}
    >
      {/* Top row: Avatar + Info + Badges */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          {member.profilePictureUrl && (
            <AvatarImage src={member.profilePictureUrl} alt={displayName} />
          )}
          <AvatarFallback
            className={cn(
              "text-xs font-medium",
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
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p
            className={cn(
              "truncate text-xs",
              isActive ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {member.email}
          </p>
          {member.jobTitle && (
            <p
              className={cn(
                "mt-0.5 truncate text-xs",
                isActive
                  ? "text-primary-foreground/60"
                  : "text-muted-foreground/80",
              )}
            >
              {member.jobTitle}
            </p>
          )}
        </div>

        {/* Admin + Directory badges */}
        <div className="flex shrink-0 items-center gap-1">
          {member.canLogin && (
            <Badge
              variant="outline"
              className={cn(
                "h-5 gap-0.5 px-1.5 text-[10px] font-normal",
                isActive
                  ? "border-primary-foreground/30 text-primary-foreground"
                  : "border-green-500/50 text-green-600 dark:text-green-400",
              )}
            >
              <UserCog className="h-2.5 w-2.5" />
              Admin
            </Badge>
          )}
          {isDirectory && (
            <Badge
              variant="secondary"
              className={cn(
                "h-5 gap-0.5 px-1.5 text-[10px] font-normal",
                isActive && "bg-primary-foreground/20 text-primary-foreground",
              )}
            >
              <FolderSync className="h-2.5 w-2.5" />
              Dir
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom row: Stats + More Details button */}
      <div className="flex items-center justify-between">
        {/* Stats badges */}
        <div className="flex flex-wrap items-center gap-1">
          {roleCount > 0 && (
            <Badge
              variant="secondary"
              className={cn(
                "h-5 gap-0.5 px-1.5 text-[10px] font-normal",
                isActive && "bg-primary-foreground/20 text-primary-foreground",
              )}
            >
              <Briefcase className="h-2.5 w-2.5" />
              {roleCount} {roleCount === 1 ? "role" : "roles"}
            </Badge>
          )}
          {totalEffort > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "h-5 gap-0.5 px-1.5 text-[10px] font-normal",
                isActive &&
                  "border-primary-foreground/30 text-primary-foreground",
              )}
            >
              <Gauge className="h-2.5 w-2.5" />
              {totalEffort} pts
            </Badge>
          )}
          {goalsTotal > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "h-5 gap-0.5 px-1.5 text-[10px] font-normal",
                isActive &&
                  "border-primary-foreground/30 text-primary-foreground",
              )}
            >
              <Target className="h-2.5 w-2.5" />
              {goalsOnTrack}/{goalsTotal}
            </Badge>
          )}
        </div>

        {/* More Details button */}
        <Button
          asChild
          variant={isActive ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "h-6 gap-1 px-2 text-xs",
            isActive &&
              "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30",
          )}
        >
          <Link href={`/member/${member.id}`}>
            Details
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
