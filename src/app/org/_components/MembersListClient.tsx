"use client";

import { useState } from "react";

import type { User } from "@workos-inc/node";
import { Mail, Shield, UserCheck } from "lucide-react";

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription className="mt-1.5">
                {members.length} {members.length === 1 ? "member" : "members"}{" "}
                in this organization
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {members.length} Total
            </Badge>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <div className="space-y-4">
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

              return (
                <div
                  key={membership.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleMemberClick(user)}
                  onKeyDown={(e) => handleKeyDown(e, user)}
                  aria-label={`View details for ${userName}`}
                  className="hover:bg-muted/50 group flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
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
                          <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
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
                      variant={
                        membership.role.slug === "admin"
                          ? "default"
                          : "secondary"
                      }
                      className="flex items-center gap-1"
                    >
                      {membership.role.slug === "admin" && (
                        <Shield className="h-3 w-3" />
                      )}
                      {membership.role.slug}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        membership.status === "active"
                          ? "border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-500"
                          : membership.status === "pending"
                            ? "border-amber-600 text-amber-600 dark:border-amber-500 dark:text-amber-500"
                            : "border-border text-muted-foreground"
                      }
                    >
                      {membership.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <Separator className="my-6" />

          <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
            <div className="bg-muted/50 space-y-1 rounded-lg p-4">
              <p className="text-primary text-2xl font-bold">
                {members.filter((m) => m.membership.status === "active").length}
              </p>
              <p className="text-muted-foreground text-sm font-medium">
                Active Members
              </p>
            </div>
            <div className="bg-muted/50 space-y-1 rounded-lg p-4">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-500">
                {
                  members.filter((m) => m.membership.status === "pending")
                    .length
                }
              </p>
              <p className="text-muted-foreground text-sm font-medium">
                Pending Invites
              </p>
            </div>
            <div className="bg-muted/50 space-y-1 rounded-lg p-4">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                {
                  members.filter(
                    (m) =>
                      m.membership.role.slug === "admin" ||
                      m.membership.role.slug === "owner",
                  ).length
                }
              </p>
              <p className="text-muted-foreground text-sm font-medium">
                Administrators
              </p>
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
