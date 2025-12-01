"use client";

import Link from "next/link";

import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Loader2, Network, Target, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
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
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2">
        <Skeleton className="h-12 rounded-none" />
        <Skeleton className="h-12 rounded-none" />
      </div>
    </Card>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

export function TeamsList() {
  const { data: teams, isLoading } = api.team.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
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
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <AnimatePresence mode="popLayout">
        {teams.map((team) => {
          const isPending = "isPending" in team && team.isPending;

          if (isPending) {
            return (
              <motion.div
                key={team.id}
                variants={cardVariants}
                layout
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="ring-primary/20 cursor-not-allowed gap-0 overflow-hidden py-0 opacity-70 ring-2">
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-2">
                      <CardTitle className="line-clamp-1 flex-1 text-xl font-semibold">
                        {team.name}
                      </CardTitle>
                      <Badge variant="outline" className="shrink-0 gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Creating
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="gap-1.5">
                        <Users className="h-3 w-3" />0 roles
                      </Badge>
                      <Badge variant="secondary" className="gap-1.5">
                        <Target className="h-3 w-3" />0 KPIs
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="bg-muted/50 flex h-9 items-center justify-center border-t text-sm">
                      <Network className="mr-1.5 h-3.5 w-3.5 opacity-50" />
                      <span className="opacity-50">Roles</span>
                    </div>
                    <div className="bg-muted/50 flex h-9 items-center justify-center border-t border-l text-sm">
                      <BarChart3 className="mr-1.5 h-3.5 w-3.5 opacity-50" />
                      <span className="opacity-50">Dashboard</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={team.id}
              variants={cardVariants}
              layout
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="group hover:border-border/80 gap-0 overflow-hidden py-0 transition-colors">
                <div className="flex flex-col gap-3 p-4">
                  <CardTitle className="line-clamp-1 text-xl font-semibold">
                    {team.name}
                  </CardTitle>

                  <div className="flex gap-2">
                    <Badge variant="secondary" className="gap-1.5">
                      <Users className="h-3 w-3" />
                      {team._count.roles}{" "}
                      {team._count.roles !== 1 ? "roles" : "role"}
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5">
                      <Target className="h-3 w-3" />
                      {team._count.metrics}{" "}
                      {team._count.metrics !== 1 ? "KPIs" : "KPI"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2">
                  <Button
                    asChild
                    variant="ghost"
                    className="hover:bg-primary/10 hover:text-primary h-9 rounded-none border-t transition-colors"
                  >
                    <Link href={`/teams/${team.id}`}>
                      <Network className="mr-1.5 h-3.5 w-3.5" />
                      Roles
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="hover:bg-primary/10 hover:text-primary h-9 rounded-none border-t border-l transition-colors"
                  >
                    <Link href={`/dashboard/${team.id}`}>
                      <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
