"use client";

import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/react";

import { CreateTeamDialog } from "./create-team-dialog";

export function TeamsList() {
  const { data: teams, isLoading } = api.team.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading teams...</p>
      </div>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="py-16 text-center">
          <CardTitle className="text-2xl">No teams yet</CardTitle>
          <CardDescription className="text-base">
            Create your first team to start building role structures
          </CardDescription>
          <div className="pt-6">
            <CreateTeamDialog />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <Link key={team.id} href={`/teams/${team.id}`}>
          <Card className="h-full cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-xl">
            <CardHeader className="space-y-3">
              <CardTitle className="line-clamp-1 text-xl">
                {team.name}
              </CardTitle>
              <CardDescription className="line-clamp-2 text-base">
                {team.description ?? "No description"}
              </CardDescription>
              <div className="text-muted-foreground flex items-center justify-between border-t pt-4 text-sm">
                <span className="font-medium">
                  {team._count.roles} role
                  {team._count.roles !== 1 ? "s" : ""}
                </span>
                <span className="text-xs">
                  Updated{" "}
                  {new Date(team.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
