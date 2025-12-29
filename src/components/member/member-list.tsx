"use client";

import { ExternalLink, FolderSync, LogIn, Mail } from "lucide-react";
import { Link } from "next-transition-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        "group relative flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-all duration-200",
        "border-border bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-md",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
      )}
    >
      <Avatar className="group-hover:ring-primary/20 h-10 w-10 shrink-0 ring-2 ring-transparent transition-all">
        <AvatarFallback className="bg-primary/10 text-primary group-hover:bg-primary/20 text-sm font-medium transition-colors">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="group-hover:text-primary truncate font-medium transition-colors">
          {displayName}
        </p>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-sm">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{member.email ?? "No email"}</span>
        </div>
        {member.jobTitle && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {member.jobTitle}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {isDirectory && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 text-xs"
            >
              <FolderSync className="h-3 w-3" />
              Directory
            </Badge>
          )}
          {member.canLogin && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 border-green-500/50 text-xs text-green-600 dark:text-green-400"
            >
              <LogIn className="h-3 w-3" />
              Can Login
            </Badge>
          )}
        </div>
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

interface MembersPanelProps {
  members: Member[];
  title?: string;
  className?: string;
}

/**
 * Complete members panel with header and list.
 * Use this for consistent styling across org page and canvas sidebar.
 */
export function MembersPanel({
  members,
  title = "Members",
  className,
}: MembersPanelProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/member">
            View All
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <MembersList members={members} />
      </div>
    </div>
  );
}
