"use client";

import Link from "next/link";

import { Check, ChevronsUpDown, Users } from "lucide-react";
import { useTransitionRouter } from "next-transition-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

interface TeamSwitcherProps {
  currentTeamId: string;
  currentTeamName: string;
  className?: string;
}

export function TeamSwitcher({
  currentTeamId,
  currentTeamName,
  className,
}: TeamSwitcherProps) {
  const router = useTransitionRouter();
  const utils = api.useUtils();

  const cachedTeams = utils.team.getAll.getData();

  const { data: teams, isLoading } = api.team.getAll.useQuery(undefined, {
    enabled: !cachedTeams,
    initialData: cachedTeams,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "bg-background/95 supports-backdrop-filter:bg-background/60 flex items-center gap-2 backdrop-blur",
            className,
          )}
        >
          <Users className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{currentTeamName}</span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        <DropdownMenuLabel>Switch Team</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled>Loading teams...</DropdownMenuItem>
        ) : teams?.length === 0 ? (
          <DropdownMenuItem disabled>No teams available</DropdownMenuItem>
        ) : (
          teams?.map((team) => (
            <DropdownMenuItem key={team.id} asChild>
              <Link
                href={`/teams/${team.id}`}
                className="flex items-center justify-between"
                onClick={(e) => {
                  // Allow opening in new tab with cmd/ctrl+click
                  if (e.metaKey || e.ctrlKey) return;

                  // Use transition router for normal clicks
                  e.preventDefault();
                  router.push(`/teams/${team.id}`);
                }}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{team.name}</span>
                  {team.description && (
                    <span className="text-muted-foreground text-xs">
                      {team.description}
                    </span>
                  )}
                </div>
                {team.id === currentTeamId && (
                  <Check className="text-primary h-4 w-4" />
                )}
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
