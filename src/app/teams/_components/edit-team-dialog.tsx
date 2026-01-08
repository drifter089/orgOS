"use client";

import { useCallback, useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Loader2, Pencil, Target } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { RoleDialog } from "@/app/teams/[teamId]/_components/role-dialog";
import { RoleCard, type RoleCardData } from "@/components/role/role-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

import { EditTeamMetricCard } from "./edit-team-metric-card";

const teamFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
});

type TeamFormData = z.infer<typeof teamFormSchema>;

interface EditTeamDialogProps {
  teamId: string;
  teamName: string;
  roleCount: number;
  metricCount: number;
}

export function EditTeamDialog({
  teamId,
  teamName,
  roleCount,
  metricCount,
}: EditTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const utils = api.useUtils();

  // Queries - only fetch when dialog is open
  const { data: team, isLoading: teamLoading } = api.team.getById.useQuery(
    { id: teamId },
    { enabled: open },
  );
  const { data: roles, isLoading: rolesLoading } =
    api.role.getByTeamId.useQuery({ teamId }, { enabled: open });
  const { data: dashboardCharts, isLoading: chartsLoading } =
    api.dashboard.getDashboardCharts.useQuery({ teamId }, { enabled: open });

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: teamName,
      description: "",
    },
  });

  // Reset form when team data loads
  useEffect(() => {
    if (team && open) {
      form.reset({
        name: team.name,
        description: team.description ?? "",
      });
    }
  }, [team, open, form]);

  const updateTeam = api.team.update.useMutation({
    onMutate: async (newData) => {
      await utils.team.getAll.cancel();
      await utils.team.getById.cancel({ id: teamId });

      const previousTeams = utils.team.getAll.getData();
      const previousTeam = utils.team.getById.getData({ id: teamId });

      // Optimistic update for getAll
      utils.team.getAll.setData(undefined, (old) =>
        old?.map((t) =>
          t.id === teamId ? { ...t, name: newData.name ?? t.name } : t,
        ),
      );

      // Optimistic update for getById
      if (previousTeam) {
        utils.team.getById.setData(
          { id: teamId },
          {
            ...previousTeam,
            name: newData.name ?? previousTeam.name,
            description: newData.description ?? previousTeam.description,
          },
        );
      }

      return { previousTeams, previousTeam };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTeams) {
        utils.team.getAll.setData(undefined, context.previousTeams);
      }
      if (context?.previousTeam) {
        utils.team.getById.setData({ id: teamId }, context.previousTeam);
      }
    },
    onSettled: () => {
      void utils.team.getAll.invalidate();
      void utils.team.getById.invalidate({ id: teamId });
    },
  });

  const onSubmit = useCallback(
    (data: TeamFormData) => {
      updateTeam.mutate({
        id: teamId,
        name: data.name,
        description: data.description,
      });
    },
    [teamId, updateTeam],
  );

  const roleCardData: RoleCardData[] =
    roles?.map((role) => ({
      id: role.id,
      title: role.title,
      purpose: role.purpose,
      color: role.color ?? "#3b82f6",
      effortPoints: role.effortPoints,
      assignedUserId: role.assignedUserId,
      assignedUserName: role.assignedUserName,
      metric: role.metric
        ? {
            name: role.metric.name,
            dashboardCharts: role.metric.dashboardCharts,
          }
        : null,
    })) ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <button
                data-edit-button
                className={cn(
                  "bg-primary/10 text-primary border-primary/30",
                  "hover:bg-primary hover:text-primary-foreground hover:border-primary",
                  "flex h-6 w-6 items-center justify-center",
                  "rounded-tl-[calc(var(--radius)-1px)] rounded-br-md border-r border-b",
                  "transition-all",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Edit team</span>
              </button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Edit team</TooltipContent>
        </Tooltip>

        <DialogContent
          className="flex h-[85vh] max-h-[85vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl">Edit Team</DialogTitle>
              <DialogDescription>
                Update team details and manage roles and metrics
              </DialogDescription>
            </DialogHeader>

            {teamLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-3"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter team name"
                            className="h-10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your team (optional)"
                            className="min-h-[60px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={updateTeam.isPending || !form.formState.isDirty}
                    >
                      {updateTeam.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>

          <div className="[&::-webkit-scrollbar-thumb]:bg-border/40 hover:[&::-webkit-scrollbar-thumb]:bg-border/60 min-h-0 flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            <section className="mb-8">
              <h3 className="text-muted-foreground mb-4 flex items-center gap-2 text-sm font-medium">
                <Briefcase className="h-4 w-4" />
                Roles
                <Badge variant="secondary" className="ml-1">
                  {rolesLoading ? "..." : roleCardData.length}
                </Badge>
              </h3>

              {rolesLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: roleCount || 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-lg" />
                  ))}
                </div>
              ) : roleCardData.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                  No roles yet. Create roles on the team canvas.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {roleCardData.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      teamId={teamId}
                      onEdit={() => setEditingRoleId(role.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-muted-foreground mb-4 flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                KPIs
                <Badge variant="secondary" className="ml-1">
                  {chartsLoading ? "..." : (dashboardCharts?.length ?? 0)}
                </Badge>
              </h3>

              {chartsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: metricCount || 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : !dashboardCharts || dashboardCharts.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                  No KPIs yet. Add metrics from the team canvas or dashboard.
                </div>
              ) : (
                <div className="space-y-2">
                  {dashboardCharts.map((dc) => (
                    <EditTeamMetricCard
                      key={dc.id}
                      dashboardChart={dc}
                      teamId={teamId}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {editingRoleId && (
        <RoleDialog
          teamId={teamId}
          roleData={{ roleId: editingRoleId }}
          open={!!editingRoleId}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingRoleId(null);
          }}
        />
      )}
    </>
  );
}
