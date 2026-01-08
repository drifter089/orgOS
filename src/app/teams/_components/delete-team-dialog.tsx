"use client";

import { useState } from "react";

import { Briefcase, Loader2, Target, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/trpc/react";

interface DeleteTeamDialogProps {
  teamId: string;
  teamName: string;
  roleCount: number;
  metricCount: number;
}

export function DeleteTeamDialog({
  teamId,
  teamName,
  roleCount,
  metricCount,
}: DeleteTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const deleteTeam = api.team.delete.useMutation({
    onMutate: async () => {
      await utils.team.getAll.cancel();
      const previousTeams = utils.team.getAll.getData();

      utils.team.getAll.setData(undefined, (old) =>
        old?.filter((t) => t.id !== teamId),
      );

      return { previousTeams };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTeams) {
        utils.team.getAll.setData(undefined, context.previousTeams);
      }
    },
    onSettled: () => {
      void utils.team.getAll.invalidate();
    },
    onSuccess: () => {
      setOpen(false);
    },
  });

  const handleDelete = () => {
    deleteTeam.mutate({ id: teamId });
  };

  const totalDeletions = roleCount + metricCount;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <button
              data-delete-button
              className="bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive flex h-6 w-6 items-center justify-center rounded-tr-[calc(var(--radius)-1px)] rounded-bl-md border-b border-l transition-all"
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Delete team</span>
            </button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Delete team</TooltipContent>
      </Tooltip>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{teamName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This action cannot be undone. This will permanently delete the
                team and all associated data.
              </p>

              {totalDeletions > 0 && (
                <div className="border-destructive/20 bg-destructive/10 rounded-md border p-3">
                  <p className="text-destructive mb-2 text-sm font-medium">
                    The following will be permanently deleted:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roleCount > 0 && (
                      <Badge variant="secondary" className="gap-1.5">
                        <Briefcase className="h-3 w-3" />
                        {roleCount} {roleCount === 1 ? "role" : "roles"}
                      </Badge>
                    )}
                    {metricCount > 0 && (
                      <Badge variant="secondary" className="gap-1.5">
                        <Target className="h-3 w-3" />
                        {metricCount} {metricCount === 1 ? "metric" : "metrics"}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTeam.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteTeam.isPending}
            className={buttonVariants({ variant: "destructive" })}
          >
            {deleteTeam.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Team"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
