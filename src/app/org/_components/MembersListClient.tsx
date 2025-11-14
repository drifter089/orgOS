"use client";

import { useState } from "react";

import type { User } from "@workos-inc/node";
import { ChevronRight, Clock, Mail, Shield, UserCheck } from "lucide-react";

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
  user: User | Record<string, unknown>;
  membership: {
    id: string;
    status: string;
    role: {
      slug: string;
    };
  };
}

interface MembersListClientProps {
  members: Member[];
}

export function MembersListClient({ members }: MembersListClientProps) {
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Organization Members</CardTitle>
              <CardDescription className="text-base">
                Manage your team members and their roles
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
            {members.map(({ user, membership }) => {
              // Get initials for avatar with safe fallbacks
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
                    "group relative flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all duration-200",
                    isAdmin
                      ? "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 hover:shadow-md"
                      : "border-border bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-md",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  )}
                >
                  {/* Admin indicator badge */}
                  {isAdmin && (
                    <div className="bg-primary absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full">
                      <Shield className="text-primary-foreground h-3.5 w-3.5" />
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
                        {membership.status === "active" && (
                          <UserCheck className="h-4 w-4 text-emerald-600/90 dark:text-emerald-400/90" />
                        )}
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{email ?? "No email"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Role & Status */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isAdmin ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {isAdmin && <Shield className="h-3 w-3" />}
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
                      className="capitalize"
                    >
                      {membership.status}
                    </Badge>
                    <ChevronRight className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-all group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <Separator className="my-6" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Active Members - Primary emphasis */}
            <div className="border-border from-primary/10 to-primary/5 relative overflow-hidden rounded-lg border bg-gradient-to-br p-6 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Active Members
                  </p>
                  <p className="text-primary text-3xl font-bold">
                    {
                      members.filter((m) => m.membership.status === "active")
                        .length
                    }
                  </p>
                </div>
                <div className="bg-primary/10 rounded-full p-3">
                  <UserCheck className="text-primary h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Pending - Secondary emphasis */}
            <div className="border-border relative overflow-hidden rounded-lg border bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-6 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Pending Invites
                  </p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {
                      members.filter((m) => m.membership.status === "pending")
                        .length
                    }
                  </p>
                </div>
                <div className="rounded-full bg-orange-500/10 p-3">
                  <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            {/* Admins - Tertiary emphasis */}
            <div className="border-border bg-card relative overflow-hidden rounded-lg border p-6 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Administrators
                  </p>
                  <p className="text-3xl font-bold">
                    {
                      members.filter(
                        (m) =>
                          m.membership.role.slug === "admin" ||
                          m.membership.role.slug === "owner",
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-muted rounded-full p-3">
                  <Shield className="text-muted-foreground h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Roles Dialog */}
      <UserRolesDialog
        user={selectedUser}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
