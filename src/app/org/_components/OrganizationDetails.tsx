import { Building2, Calendar, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/server";

import { AllMembersSheet } from "./AllMembersSheet";

export async function OrganizationDetails() {
  const [orgData, members] = await Promise.all([
    api.organization.getCurrent(),
    api.organization.getCurrentOrgMembers(),
  ]);

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
    <Card className="overflow-hidden">
      <CardHeader className="pb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="bg-primary/10 ring-primary/20 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl ring-2">
              <Building2 className="text-primary h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-4xl font-extrabold tracking-tight">
                {organization.name}
              </CardTitle>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 px-4 py-1.5 text-sm font-semibold capitalize"
          >
            {membership.role.slug}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Created Date */}
          <div className="group border-border from-muted/50 to-muted/20 rounded-xl border bg-gradient-to-br p-5 transition-all hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="bg-background ring-border flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ring-1">
                <Calendar className="text-muted-foreground h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Created
                </p>
                <p className="text-sm leading-tight font-medium">
                  {new Date(organization.createdAt).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="group border-border from-muted/50 to-muted/20 rounded-xl border bg-gradient-to-br p-5 transition-all hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="bg-background ring-border flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ring-1">
                <UserCheck className="text-muted-foreground h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Status
                </p>
                <div>
                  <Badge
                    variant="outline"
                    className="mt-0.5 font-medium capitalize"
                  >
                    {membership.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Total Members */}
          <div className="group border-border from-muted/50 to-muted/20 rounded-xl border bg-gradient-to-br p-5 transition-all hover:shadow-md">
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Total Members
              </p>
              <div className="pt-0.5">
                <AllMembersSheet members={members} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
