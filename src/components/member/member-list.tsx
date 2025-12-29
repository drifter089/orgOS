"use client";

import { ChevronRight, FolderSync, LogIn, Mail } from "lucide-react";
import { Link } from "next-transition-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];

/**
 * Get member display name and initials
 */
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

interface MemberCardProps {
  member: Member;
}

function MemberCard({ member }: MemberCardProps) {
  const { initials, displayName } = getMemberDisplayInfo(member);
  const isDirectory = member.source === "directory" || member.source === "both";

  return (
    <Link
      href={`/member/${member.id}`}
      aria-label={`View details for ${displayName}`}
      className={cn(
        "group relative flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all duration-200",
        isDirectory
          ? "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-md"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-md",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
      )}
    >
      {isDirectory && (
        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
          <FolderSync className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Avatar className="group-hover:ring-primary/20 h-12 w-12 ring-2 ring-transparent transition-all group-hover:scale-105">
          <AvatarFallback className="bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-1">
          <p className="group-hover:text-primary font-semibold transition-colors">
            {displayName}
          </p>
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Mail className="h-3.5 w-3.5" />
            <span>{member.email ?? "No email"}</span>
          </div>
          {member.jobTitle && (
            <p className="text-muted-foreground text-xs">{member.jobTitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {member.canLogin ? (
          <Badge
            variant="outline"
            className="flex items-center gap-1 border-green-500/50 text-green-600 dark:text-green-400"
          >
            <LogIn className="h-3 w-3" />
            Can Login
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-muted-foreground flex items-center gap-1"
          >
            No Login
          </Badge>
        )}
        <Badge
          variant={isDirectory ? "default" : "secondary"}
          className="flex items-center gap-1"
        >
          {isDirectory && <FolderSync className="h-3 w-3" />}
          {isDirectory ? "Directory" : "Member"}
        </Badge>
        <ChevronRight className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-all group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

interface MembersListProps {
  members: Member[];
  className?: string;
}

export function MembersList({ members, className }: MembersListProps) {
  if (!members || members.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
        <p className="text-sm font-medium">No members found</p>
        <p className="text-xs">Members will appear here once added</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {members.map((member) => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}
