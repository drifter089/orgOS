import { Building2, Calendar, Users } from "lucide-react";

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

export async function OrganizationDetails() {
  const orgData = await api.organization.getCurrent();

  if (!orgData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Organization Found</CardTitle>
          <CardDescription>
            You are not currently a member of any organization.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { organization, membership } = orgData;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
              <Building2 className="text-primary h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">{organization.name}</CardTitle>
              <CardDescription className="mt-1">
                Organization ID: {organization.id}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {membership.role.slug}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Created Date */}
          <div className="flex items-start gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
              <Calendar className="text-muted-foreground h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-muted-foreground text-sm">
                {new Date(organization.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Membership Status */}
          <div className="flex items-start gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
              <Users className="text-muted-foreground h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Your Status</p>
              <p className="text-muted-foreground text-sm">
                <Badge variant="outline" className="mt-1">
                  {membership.status}
                </Badge>
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <Separator className="my-6" />

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Membership Information</h4>
          <div className="grid gap-2 text-sm">
            {"createdAt" in membership && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">
                  {new Date(membership.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Role</span>
              <span className="font-medium capitalize">
                {membership.role.slug}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
