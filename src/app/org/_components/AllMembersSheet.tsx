"use client";

import { useState } from "react";

import { ChevronRight, FolderSync, LogIn, Mail, Users } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";

import { UserRolesDialog } from "./UserRolesDialog";

type Member = RouterOutputs["organization"]["getMembers"][number];

interface AllMembersSheetProps {
  members: Member[];
}

export function AllMembersSheet({ members }: AllMembersSheetProps) {
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

  const totalMembers = members.length;

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-[130px] gap-2 font-semibold">
            <Users className="h-4 w-4" />
            {totalMembers} {totalMembers === 1 ? "Member" : "Members"}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full overflow-y-auto px-6 sm:max-w-2xl">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-3xl font-bold">
              Organization Members
            </SheetTitle>
            <SheetDescription className="pt-1 text-base">
              View your team members
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            {members.map((member) => {
              const initials =
                member.firstName && member.lastName
                  ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                  : (member.email?.[0]?.toUpperCase() ?? "U");

              const userName =
                member.firstName && member.lastName
                  ? `${member.firstName} ${member.lastName}`
                  : (member.email ?? "Member");

              const isDirectory =
                member.source === "directory" || member.source === "both";

              return (
                <div
                  key={member.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleMemberClick(member)}
                  onKeyDown={(e) => handleKeyDown(e, member)}
                  aria-label={`View details for ${userName}`}
                  className={cn(
                    "group relative flex cursor-pointer items-center justify-between rounded-xl border p-5 transition-all duration-200",
                    isDirectory
                      ? "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-lg"
                      : "border-border bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  )}
                >
                  {/* Directory indicator badge */}
                  {isDirectory && (
                    <div className="ring-background absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 shadow-md ring-2">
                      <FolderSync className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div className="flex items-center gap-5">
                    {/* Avatar with transition */}
                    <Avatar className="group-hover:ring-primary/20 h-14 w-14 ring-2 ring-transparent transition-all group-hover:scale-105 group-hover:shadow-md">
                      <AvatarFallback className="bg-primary/10 text-primary group-hover:bg-primary/20 text-base font-semibold transition-colors">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <p className="group-hover:text-primary text-base font-bold transition-colors">
                          {userName}
                        </p>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4" />
                        <span>{member.email ?? "No email"}</span>
                      </div>
                      {member.jobTitle && (
                        <p className="text-muted-foreground text-sm">
                          {member.jobTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Source Badge */}
                  <div className="flex items-center gap-3">
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
                      className="flex items-center gap-1.5 px-3 py-1 font-semibold"
                    >
                      {isDirectory && <FolderSync className="h-3.5 w-3.5" />}
                      {isDirectory ? "Directory" : "Member"}
                    </Badge>
                    <ChevronRight className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-all group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

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
