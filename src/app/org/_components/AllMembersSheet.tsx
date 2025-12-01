"use client";

import { useState } from "react";

import type { User } from "@workos-inc/node";
import { ChevronRight, Mail, Shield, UserCheck, Users } from "lucide-react";

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

import { UserRolesDialog } from "./UserRolesDialog";

interface Member {
  user: User | Record<string, unknown>;
  membership: {
    id: string;
    status: string;
    role: {
      slug: string;
    };
  };
}

interface AllMembersSheetProps {
  members: Member[];
}

export function AllMembersSheet({ members }: AllMembersSheetProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleMemberClick = (user: User | Record<string, unknown>) => {
    setSelectedUser(user as User);
    setIsDialogOpen(true);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    user: User | Record<string, unknown>,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleMemberClick(user);
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
              Manage your team members and their roles
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            {members.map(({ user, membership }) => {
              const userObj = user as Record<string, unknown>;
              const firstName = userObj.firstName as string | null | undefined;
              const lastName = userObj.lastName as string | null | undefined;
              const email = userObj.email as string | null | undefined;

              const initials =
                firstName && lastName
                  ? `${firstName[0]}${lastName[0]}`.toUpperCase()
                  : (email?.[0]?.toUpperCase() ?? "U");

              const userName =
                firstName && lastName
                  ? `${firstName} ${lastName}`
                  : (email ?? "Member");

              const isAdmin =
                membership.role.slug === "admin" ||
                membership.role.slug === "owner";

              return (
                <div
                  key={membership.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleMemberClick(user)}
                  onKeyDown={(e) => handleKeyDown(e, user)}
                  aria-label={`View details for ${userName}`}
                  className={cn(
                    "group relative flex cursor-pointer items-center justify-between rounded-xl border p-5 transition-all duration-200",
                    isAdmin
                      ? "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 hover:shadow-lg"
                      : "border-border bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-lg",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  )}
                >
                  {/* Admin indicator badge */}
                  {isAdmin && (
                    <div className="bg-primary ring-background absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full shadow-md ring-2">
                      <Shield className="text-primary-foreground h-4 w-4" />
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
                        {membership.status === "active" && (
                          <UserCheck className="h-4 w-4 text-emerald-600/90 dark:text-emerald-400/90" />
                        )}
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4" />
                        <span>{email ?? "No email"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Role & Status */}
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={isAdmin ? "default" : "secondary"}
                      className="flex items-center gap-1.5 px-3 py-1 font-semibold"
                    >
                      {isAdmin && <Shield className="h-3.5 w-3.5" />}
                      {membership.role.slug}
                    </Badge>
                    <Badge
                      variant={
                        membership.status === "active"
                          ? "success"
                          : membership.status === "pending"
                            ? "warning"
                            : "outline"
                      }
                      className="px-3 py-1 font-semibold capitalize"
                    >
                      {membership.status}
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
        user={selectedUser}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
