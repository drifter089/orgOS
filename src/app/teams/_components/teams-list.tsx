"use client";

import Link from "next/link";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, Target, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { DeleteTeamDialog } from "./delete-team-dialog";

function TeamCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
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
                <Card className="ring-primary/20 cursor-not-allowed p-4 opacity-70 ring-2">
                  <div className="flex flex-col gap-3">
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
                </Card>
              </motion.div>
            );
          }

          const isLocked = team.isLocked;
          const lockedByUserName = team.lockedByUserName;

          const handleLockedClick = () => {
            toast.error("Team is currently being edited", {
              description: `${lockedByUserName ?? "Another user"} is editing this team. Please try again later.`,
            });
          };

          if (isLocked) {
            return (
              <motion.div
                key={team.id}
                variants={cardVariants}
                layout
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card
                  className="cursor-not-allowed p-4 opacity-60"
                  onClick={handleLockedClick}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-1 text-2xl font-bold">
                        {team.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-amber-700"
                      >
                        <Lock className="mr-1 h-3 w-3" />
                        {lockedByUserName ?? "In use"}
                      </Badge>
                    </div>
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
              <Link href={`/teams/${team.id}`} className="block">
                <Card className="group hover:border-primary/50 hover:bg-accent/50 cursor-pointer p-4 transition-colors">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="group-hover:text-primary line-clamp-1 text-2xl font-bold transition-colors">
                        {team.name}
                      </CardTitle>
                      <DeleteTeamDialog
                        teamId={team.id}
                        teamName={team.name}
                        roleCount={team._count.roles}
                        metricCount={team._count.metrics}
                      />
                    </div>
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
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
