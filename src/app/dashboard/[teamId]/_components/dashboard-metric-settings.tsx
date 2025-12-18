"use client";

import { useEffect, useState } from "react";

import type { Role } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";

import type { ChartTransformResult } from "./dashboard-metric-card";

type Cadence = "DAILY" | "WEEKLY" | "MONTHLY";

interface DashboardMetricSettingsProps {
  metricId: string;
  metricName: string;
  metricDescription: string | null;
  chartTransform: ChartTransformResult | null;
  hasChartData: boolean;
  integrationId: string | null;
  lastFetchedAt: Date | null;
  lastError: string | null;
  pollFrequency: string;
  isProcessing: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  prompt: string;
  currentChartType: string | null;
  currentCadence: Cadence | null;
  roles: Role[];
  onPromptChange: (value: string) => void;
  onRegenerate: (
    chartType?: string,
    cadence?: Cadence,
    userPrompt?: string,
  ) => void;
  onRefresh: () => void;
  onUpdateMetric: (name: string, description: string) => void;
  onDelete: () => void;
}

const CADENCE_OPTIONS: Cadence[] = ["DAILY", "WEEKLY", "MONTHLY"];

export function DashboardMetricSettings({
  metricName,
  metricDescription,
  chartTransform,
  integrationId,
  lastFetchedAt,
  lastError,
  pollFrequency,
  isProcessing,
  isUpdating,
  isDeleting,
  prompt,
  currentChartType,
  currentCadence,
  roles,
  onPromptChange,
  onRegenerate,
  onRefresh,
  onUpdateMetric,
  onDelete,
}: DashboardMetricSettingsProps) {
  const [name, setName] = useState(metricName);
  const [selectedChartType, setSelectedChartType] = useState(
    currentChartType ?? "bar",
  );
  const [selectedCadence, setSelectedCadence] = useState<Cadence>(
    currentCadence ?? "WEEKLY",
  );
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  useEffect(() => {
    setName(metricName);
  }, [metricName]);

  useEffect(() => {
    if (currentChartType) setSelectedChartType(currentChartType);
  }, [currentChartType]);

  useEffect(() => {
    if (currentCadence) setSelectedCadence(currentCadence);
  }, [currentCadence]);

  const hasNameChanges = name !== metricName;

  const hasChartChanges =
    selectedChartType !== (currentChartType ?? "bar") ||
    selectedCadence !== (currentCadence ?? "WEEKLY") ||
    prompt.trim() !== "";

  const handleSave = () => {
    if (hasNameChanges && name.trim()) {
      onUpdateMetric(name.trim(), metricDescription ?? "");
    }
  };

  const handleApplyChanges = () => {
    onRegenerate(selectedChartType, selectedCadence, prompt || undefined);
  };

  const platformConfig = integrationId
    ? getPlatformConfig(integrationId)
    : null;

  const primaryRole = roles[0];

  return (
    <Card className="flex h-full flex-col border-0 shadow-none">
      <CardContent className="flex flex-1 flex-col gap-2 p-4 pt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Metric Name
            </label>
            {platformConfig && (
              <Badge
                className={cn(
                  "ml-auto shrink-0 text-[10px]",
                  platformConfig.bgColor,
                  platformConfig.textColor,
                )}
              >
                {platformConfig.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isUpdating}
              className="h-8 text-sm"
            />
            {hasNameChanges && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                disabled={!name.trim() || isUpdating}
                className="h-8 w-8 shrink-0"
              >
                {isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-0.5">
          <label className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            Visualization
          </label>
          <ToggleGroup
            type="single"
            value={selectedChartType}
            onValueChange={(value) => {
              if (value) setSelectedChartType(value);
            }}
            className="grid w-full grid-cols-2 gap-0 rounded-md border"
          >
            <ToggleGroupItem
              value="bar"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-7 gap-1.5 rounded-none rounded-l-md border-r text-xs"
            >
              <BarChart3 className="h-3 w-3" />
              Bar
            </ToggleGroupItem>
            <ToggleGroupItem
              value="line"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-7 gap-1.5 rounded-none rounded-r-md text-xs"
            >
              <TrendingUp className="h-3 w-3" />
              Line
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="space-y-0.5">
          <label className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            Time Cadence
          </label>
          <ToggleGroup
            type="single"
            value={selectedCadence}
            onValueChange={(value) => {
              if (value) setSelectedCadence(value as Cadence);
            }}
            className="grid w-full grid-cols-3 gap-0 rounded-md border"
          >
            {CADENCE_OPTIONS.map((cadence, index) => (
              <ToggleGroupItem
                key={cadence}
                value={cadence}
                className={`data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-7 rounded-none text-xs ${
                  index === 0
                    ? "rounded-l-md border-r"
                    : index === CADENCE_OPTIONS.length - 1
                      ? "rounded-r-md"
                      : "border-r"
                }`}
              >
                {cadence.charAt(0) + cadence.slice(1).toLowerCase()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 text-[10px] tracking-wider uppercase transition-colors">
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform",
                isAdvancedOpen && "rotate-90",
              )}
            />
            AI Prompt
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1">
            <Textarea
              placeholder="Custom prompt: 'show trends', 'group by category'..."
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={isProcessing}
              className="min-h-[40px] resize-none text-xs"
            />
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2">
          <Button
            variant={hasChartChanges ? "default" : "outline"}
            size="sm"
            onClick={handleApplyChanges}
            disabled={isProcessing || !hasChartChanges}
            className="h-7 flex-1 text-xs"
          >
            {isProcessing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" />
            )}
            Apply
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isProcessing}
            className="h-7 text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Refetch
          </Button>
        </div>

        {roles.length > 0 && (
          <div className="space-y-0.5">
            <label className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Metric Owned By
            </label>
            <Select defaultValue={roles[0]?.id}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span>{role.title}</span>
                      {role.assignedUserId && (
                        <span className="text-muted-foreground text-[10px]">
                          • Assigned
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 border-t pt-2">
          {lastError && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-destructive truncate text-[10px]">
                  Error: {lastError}
                </p>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px]">
                <p className="text-xs">{lastError}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <div className="flex items-center justify-between">
            {lastFetchedAt && (
              <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(lastFetchedAt), {
                  addSuffix: true,
                })}
              </span>
            )}
            <Badge variant="outline" className="text-[10px]">
              {pollFrequency}
            </Badge>
          </div>

          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive/80 flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            delete metric
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
