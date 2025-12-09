"use client";

import { Loader2, Plus, RefreshCw, Sparkles, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  type SuggestedRole,
  useRoleEnhancement,
  useRoleSuggestions,
} from "../hooks/use-role-suggestions";

interface AIRoleSuggestionsProps {
  teamId: string;
  onSelectRole: (role: SuggestedRole) => void;
  onSelectTitle?: (title: string) => void;
  currentTitle?: string;
  currentPurpose?: string;
  className?: string;
}

export function AIRoleSuggestions({
  teamId,
  onSelectRole,
  onSelectTitle,
  currentTitle,
  currentPurpose,
  className,
}: AIRoleSuggestionsProps) {
  const {
    suggestions,
    isLoading: isLoadingSuggestions,
    error: suggestionsError,
    refetch,
    markRoleAsUsed,
  } = useRoleSuggestions(teamId);

  const { enhancement, isEnhancing, requestEnhancement } =
    useRoleEnhancement(teamId);

  const handleSelectRole = (role: SuggestedRole) => {
    onSelectRole(role);
    markRoleAsUsed(role);
  };

  const handleEnhanceClick = () => {
    if (currentTitle ?? currentPurpose) {
      requestEnhancement({
        title: currentTitle,
        purpose: currentPurpose,
      });
    }
  };

  return (
    <div
      className={cn(
        "border-border bg-muted/30 flex w-64 flex-col rounded-lg border",
        className,
      )}
    >
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">AI Suggestions</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => void refetch()}
              disabled={isLoadingSuggestions}
            >
              <RefreshCw
                className={cn(
                  "h-3 w-3",
                  isLoadingSuggestions && "animate-spin",
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Regenerate suggestions</TooltipContent>
        </Tooltip>
      </div>

      {/* Content - no internal scroll */}
      <div className="flex flex-col gap-2 p-2">
        {isLoadingSuggestions && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            <span className="text-muted-foreground ml-2 text-xs">
              Generating...
            </span>
          </div>
        )}

        {suggestionsError && (
          <div className="rounded-md bg-red-50 p-2 dark:bg-red-950/20">
            <p className="text-xs text-red-600 dark:text-red-400">
              Failed to load.{" "}
              <button
                className="underline hover:no-underline"
                onClick={() => void refetch()}
              >
                Retry
              </button>
            </p>
          </div>
        )}

        {!isLoadingSuggestions &&
          !suggestionsError &&
          suggestions.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-xs">
              No suggestions available
            </p>
          )}

        {!isLoadingSuggestions &&
          !suggestionsError &&
          suggestions.map((role, index) => (
            <SuggestionCard
              key={`${role.title}-${index}`}
              role={role}
              onSelect={() => handleSelectRole(role)}
            />
          ))}

        {/* Title Enhancements Section */}
        {(currentTitle ?? currentPurpose) && (
          <div className="border-border space-y-2 border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[0.625rem] font-medium tracking-wide uppercase">
                Enhance Input
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[0.625rem]"
                onClick={handleEnhanceClick}
                disabled={isEnhancing}
              >
                {isEnhancing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                Enhance
              </Button>
            </div>

            {isEnhancing && (
              <p className="text-muted-foreground text-center text-[0.625rem]">
                Thinking...
              </p>
            )}

            {enhancement?.titleSuggestions &&
              enhancement.titleSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {enhancement.titleSuggestions.map((title, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer text-[0.625rem] transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30"
                      onClick={() => onSelectTitle?.(title)}
                    >
                      {title}
                    </Badge>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  role: SuggestedRole;
  onSelect: () => void;
}

function SuggestionCard({ role, onSelect }: SuggestionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="bg-background group relative w-full rounded-md border p-2 text-left transition-all hover:border-purple-300 hover:shadow-sm dark:hover:border-purple-700"
      style={{ borderLeftColor: role.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{role.title}</span>
            <Badge
              variant={role.category === "creative" ? "default" : "secondary"}
              className={cn(
                "shrink-0 px-1 py-0 text-[0.5625rem]",
                role.category === "creative" &&
                  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
              )}
            >
              {role.category === "creative" ? "Fun" : "Pro"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[0.6875rem] leading-tight">
            {role.purpose}
          </p>
        </div>
        <Plus className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  );
}
