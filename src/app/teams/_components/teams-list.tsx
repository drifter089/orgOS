"use client";

import Link from "next/link";

import { Clock, Loader2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";

import { CreateTeamDialog } from "./create-team-dialog";

function TeamCardSkeleton() {
  return (
    <Card>
      <CardHeader className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function TeamsList() {
  const { data: teams, isLoading } = api.team.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <TeamCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users className="text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>No role charts yet</EmptyTitle>
          <EmptyDescription>
            Create your first role chart to start building role structures and
            workflows
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <CreateTeamDialog />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {teams.map((team) => {
        const isPending = "isPending" in team && team.isPending;

        if (isPending) {
          return (
            <Card
              key={team.id}
              className="ring-primary/20 cursor-not-allowed opacity-70 ring-2"
            >
              <CardHeader className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="line-clamp-1 text-lg">
                        {team.name}
                      </CardTitle>
                      <Badge variant="outline" className="shrink-0 gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Creating
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-1">
                      {team.description ?? "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-sm">
                    <Badge variant="secondary" className="gap-1.5">
                      <Users className="h-3 w-3" />0 roles
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      Just now
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        }

        return (
          <Link key={team.id} href={`/teams/${team.id}`}>
            <Card className="group hover:border-primary/20 cursor-pointer transition-all hover:shadow-lg">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="group-hover:text-primary line-clamp-1 text-lg transition-colors">
                      {team.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {team.description ?? "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-sm">
                    <Badge variant="secondary" className="gap-1.5">
                      <Users className="h-3 w-3" />
                      {team._count.roles}{" "}
                      {team._count.roles !== 1 ? "roles" : "role"}
                    </Badge>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Clock className="h-3 w-3" />
                      {new Date(team.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
