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
        <CardHeader className="py-12 text-center">
          <CardTitle>No teams yet</CardTitle>
          <CardDescription>
            Create your first team to start building role structures
          </CardDescription>
          <div className="pt-4">
            <CreateTeamDialog />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <Link key={team.id} href={`/teams/${team.id}`}>
          <Card className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
            <CardHeader>
              <CardTitle className="line-clamp-1">{team.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {team.description ?? "No description"}
              </CardDescription>
              <div className="text-muted-foreground flex items-center justify-between pt-4 text-sm">
                <span>
                  {team._count.roles} role
                  {team._count.roles !== 1 ? "s" : ""}
                </span>
                <span>
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
