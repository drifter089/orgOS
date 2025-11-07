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
import { api } from "@/trpc/server";

export async function MembersList() {
  const members = await api.organization.getCurrentOrgMembers();

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Organization Members</CardTitle>
            <CardDescription className="mt-1.5">
              {members.length} {members.length === 1 ? "member" : "members"} in
              this organization
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
            // Get initials for avatar
            const initials =
              user.firstName && user.lastName
                ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                : (user.email[0]?.toUpperCase() ?? "U");

            return (
              <div
                key={membership.id}
                className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
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
                      <p className="font-semibold">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.email}
                      </p>
                      {membership.status === "active" && (
                        <UserCheck className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>

                {/* Role & Status */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      membership.role.slug === "admin" ? "default" : "secondary"
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
                        ? "border-green-600 text-green-600"
                        : membership.status === "pending"
                          ? "border-yellow-600 text-yellow-600"
                          : "border-gray-600 text-gray-600"
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

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-primary text-2xl font-bold">
              {members.filter((m) => m.membership.status === "active").length}
            </p>
            <p className="text-muted-foreground text-xs">Active</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-yellow-600">
              {members.filter((m) => m.membership.status === "pending").length}
            </p>
            <p className="text-muted-foreground text-xs">Pending</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600">
              {
                members.filter(
                  (m) =>
                    m.membership.role.slug === "admin" ||
                    m.membership.role.slug === "owner",
                ).length
              }
            </p>
            <p className="text-muted-foreground text-xs">Admins</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
