"use client";

import { useState } from "react";

import { ChevronRight, FolderSync, Mail, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { UserRolesDialog } from "./UserRolesDialog";

interface Member {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  jobTitle?: string | null;
  groups?: Array<{ id: string; name: string }>;
  source: "membership" | "directory";
}

interface MembersListClientProps {
  members: Member[];
}

export function MembersListClient({ members }: MembersListClientProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setIsDialogOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent, member: Member) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleMemberClick(member);
    }
  };

  if (!members || members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>
            No members found in this organization.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const directoryMembers = members.filter((m) => m.source === "directory");
  const membershipMembers = members.filter((m) => m.source === "membership");

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Organization Members</CardTitle>
              <CardDescription className="text-base">
                View your team members
              </CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0 px-3 py-1 text-lg">
              {members.length}
            </Badge>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <div className="space-y-3">
            {members.map((member) => {
              const initials =
                member.firstName && member.lastName
                  ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                  : (member.email?.[0]?.toUpperCase() ?? "U");

              const userName =
                member.firstName && member.lastName
                  ? `${member.firstName} ${member.lastName}`
                  : (member.email ?? "Member");

              const isDirectory = member.source === "directory";

              return (
                <div
                  key={member.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleMemberClick(member)}
                  onKeyDown={(e) => handleKeyDown(e, member)}
                  aria-label={`View details for ${userName}`}
                  className={cn(
                    "group relative flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all duration-200",
                    isDirectory
                      ? "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-md"
                      : "border-border bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-md",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  )}
                >
                  {/* Directory indicator badge */}
                  {isDirectory && (
                    <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                      <FolderSync className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    {/* Avatar with transition */}
                    <Avatar className="group-hover:ring-primary/20 h-12 w-12 ring-2 ring-transparent transition-all group-hover:scale-105">
                      <AvatarFallback className="bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="group-hover:text-primary font-semibold transition-colors">
                          {userName}
                        </p>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{member.email ?? "No email"}</span>
                      </div>
                      {member.jobTitle && (
                        <p className="text-muted-foreground text-xs">
                          {member.jobTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Source Badge */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isDirectory ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {isDirectory && <FolderSync className="h-3 w-3" />}
                      {isDirectory ? "Directory" : "Member"}
                    </Badge>
                    <ChevronRight className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-all group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <Separator className="my-6" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Directory Members */}
            <div className="border-border relative overflow-hidden rounded-lg border bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Directory Synced
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {directoryMembers.length}
                  </p>
                </div>
                <div className="rounded-full bg-blue-500/10 p-3">
                  <FolderSync className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Membership Members */}
            <div className="border-border bg-card relative overflow-hidden rounded-lg border p-6 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Direct Members
                  </p>
                  <p className="text-3xl font-bold">
                    {membershipMembers.length}
                  </p>
                </div>
                <div className="bg-muted rounded-full p-3">
                  <Users className="text-muted-foreground h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Roles Dialog */}
      <UserRolesDialog
        user={
          selectedMember
            ? {
                id: selectedMember.id,
                email: selectedMember.email,
                firstName: selectedMember.firstName,
                lastName: selectedMember.lastName,
                profilePictureUrl: selectedMember.profilePictureUrl,
              }
            : null
        }
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
