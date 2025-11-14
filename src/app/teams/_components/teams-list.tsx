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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";

import { CreateTeamDialog } from "./create-team-dialog";

function TeamCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <div className="min-h-[2.5rem] space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
    </Card>
  );
}

export function TeamsList() {
  const { data: teams, isLoading } = api.team.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <EmptyTitle>No teams yet</EmptyTitle>
          <EmptyDescription>
            Create your first team to start building role structures and
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
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => {
        const isPending = "isPending" in team && team.isPending;

        if (isPending) {
          return (
            <Card
              key={team.id}
              className="ring-primary/20 h-full cursor-not-allowed opacity-70 ring-2"
            >
              <CardHeader className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-xl">
                      {team.name}
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0 gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Creating
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {team.description ?? "No description"}
                  </CardDescription>
                </div>

                <Separator />

                <div className="text-muted-foreground flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" />0 roles
                  </span>
                  <span className="text-xs">Just now</span>
                </div>
              </CardHeader>
            </Card>
          );
        }

        return (
          <Link key={team.id} href={`/teams/${team.id}`}>
            <Card className="group hover:border-primary/20 h-full cursor-pointer transition-all hover:shadow-lg">
              <CardHeader className="space-y-4">
                <div className="space-y-2">
                  <CardTitle className="group-hover:text-primary line-clamp-1 text-xl transition-colors">
                    {team.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {team.description ?? "No description"}
                  </CardDescription>
                </div>

                <Separator />

                <div className="flex items-center justify-between text-sm">
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
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
