"use client";

import { useEffect, useState } from "react";

import type { Cadence, MetricGoal, Role } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import { GoalEditor } from "@/components/metric/goal-editor";
import { RoleAssignment } from "@/components/metric/role-assignment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatValue } from "@/lib/helpers/format-value";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import type { GoalProgress } from "@/server/api/utils/goal-calculation";
import { calculateGoalTargetValue } from "@/server/api/utils/goal-calculation";

import type { ChartTransformResult } from "./dashboard-metric-card";
import {
  DashboardMetricChart,
  type LoadingPhase,
} from "./dashboard-metric-chart";

const CADENCE_OPTIONS: Cadence[] = ["DAILY", "WEEKLY", "MONTHLY"];

interface DashboardMetricDrawerProps {
  metricId: string;
  metricName: string;
  metricDescription: string | null;
  teamId: string | null;
  chartTransform: ChartTransformResult | null;
  currentChartType: string | null;
  currentCadence: Cadence | null;
  roles: Role[];
  valueLabel: string | null;
  dataDescription: string | null;
  integrationId: string | null;
  isIntegrationMetric: boolean;
  lastFetchedAt: Date | null;
  lastError: string | null;
  pollFrequency: string;
  goal: MetricGoal | null;
  goalProgress: GoalProgress | null;
  isProcessing: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isRegeneratingPipeline: boolean;
  loadingPhase: LoadingPhase;
  onRegenerate: (
    chartType?: string,
    cadence?: Cadence,
    prompt?: string,
  ) => void;
  onRefresh: () => void;
  onRegeneratePipeline: () => void;
  onUpdateMetric: (name: string, description: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function DashboardMetricDrawer({
  metricId,
  metricName,
  metricDescription,
  teamId,
  chartTransform,
  currentChartType,
  currentCadence,
  roles,
  valueLabel,
  dataDescription: _dataDescription,
  integrationId,
  isIntegrationMetric,
  lastFetchedAt,
  lastError,
  pollFrequency,
  goal,
  goalProgress,
  isProcessing,
  isUpdating,
  isDeleting,
  isRegeneratingPipeline,
  loadingPhase,
  onRegenerate,
  onRefresh,
  onRegeneratePipeline,
  onUpdateMetric,
  onDelete,
  onClose,
}: DashboardMetricDrawerProps) {
  const [name, setName] = useState(metricName);
  const [selectedChartType, setSelectedChartType] = useState(
    currentChartType ?? "bar",
  );
  const [selectedCadence, setSelectedCadence] = useState<Cadence>(
    currentCadence ?? "WEEKLY",
  );
  const [prompt, setPrompt] = useState("");
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

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  const platformConfig = integrationId
    ? getPlatformConfig(integrationId)
    : null;

  const hasChartData = !!(
    chartTransform?.chartData && chartTransform.chartData.length > 0
  );

  const currentValue = getLatestMetricValue(chartTransform);
  const goalTargetValue =
    goal && goalProgress ? calculateGoalTargetValue(goal, goalProgress) : null;

  return (
    <>
      <DrawerHeader className="border-b">
        <div className="flex items-center justify-between">
          <DrawerTitle className="truncate">{metricName}</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </div>
        <DrawerDescription className="flex items-center gap-2">
          {platformConfig && (
            <Badge
              className={cn(
                "shrink-0 text-[10px]",
                platformConfig.bgColor,
                platformConfig.textColor,
              )}
            >
              {platformConfig.name}
            </Badge>
          )}
          {lastFetchedAt && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(lastFetchedAt), {
                addSuffix: true,
              })}
            </span>
          )}
          <Badge variant="outline" className="text-[10px]">
            {pollFrequency}
          </Badge>
          {lastError && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="text-[10px]">
                  Error
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[300px]">
                <p className="text-xs">{lastError}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </DrawerDescription>
      </DrawerHeader>

      <ScrollArea className="flex-1 overflow-auto">
        <div className="grid gap-6 p-4 md:grid-cols-2">
          {/* Left Column: Chart Preview & Current Values */}
          <div className="space-y-4">
            {/* Chart Preview */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Chart Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[280px]">
                  <DashboardMetricChart
                    title={chartTransform?.title ?? metricName}
                    chartTransform={chartTransform}
                    hasChartData={hasChartData}
                    isIntegrationMetric={isIntegrationMetric}
                    isPending={false}
                    isProcessing={isProcessing || isRegeneratingPipeline}
                    loadingPhase={loadingPhase}
                    integrationId={integrationId}
                    roles={roles}
                    goal={goal}
                    goalProgress={goalProgress}
                    valueLabel={valueLabel}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Current Value & Goal Summary */}
            <Card>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">
                      Current Value
                    </p>
                    <p className="text-2xl font-bold">
                      {currentValue ? formatValue(currentValue.value) : "--"}
                    </p>
                    {valueLabel && (
                      <p className="text-muted-foreground text-xs">
                        {valueLabel}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">
                      Goal Target
                    </p>
                    <p className="text-2xl font-bold">
                      {goalTargetValue !== null
                        ? formatValue(goalTargetValue)
                        : "--"}
                    </p>
                    {goalProgress && (
                      <p
                        className={cn(
                          "text-xs font-medium",
                          goalProgress.progressPercent >= 100
                            ? "text-green-600"
                            : goalProgress.progressPercent >= 70
                              ? "text-blue-600"
                              : "text-amber-600",
                        )}
                      >
                        {Math.round(goalProgress.progressPercent)}% complete
                      </p>
                    )}
                  </div>
                </div>

                {/* Data Info */}
                {chartTransform?.dataKeys &&
                  chartTransform.dataKeys.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs font-medium">
                        Tracked Metrics
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {chartTransform.dataKeys.map((key) => (
                          <Badge
                            key={key}
                            variant="outline"
                            className="text-xs"
                          >
                            {chartTransform.chartConfig?.[key]?.label ?? key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {chartTransform?.description && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium">
                      Chart Aggregation
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {chartTransform.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Settings */}
          <div className="space-y-4">
            {/* Goal Settings */}
            {teamId && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Target className="h-4 w-4" />
                    Goal Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GoalEditor
                    metricId={metricId}
                    initialGoal={goal}
                    initialProgress={goalProgress}
                    cadence={currentCadence}
                    compact={true}
                  />
                </CardContent>
              </Card>
            )}

            {/* Role Assignment */}
            {teamId && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4" />
                    Role Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RoleAssignment
                    metricId={metricId}
                    metricName={metricName}
                    teamId={teamId}
                    assignedRoleIds={roles.map((r) => r.id)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Chart Settings (Integration metrics only) */}
            {isIntegrationMetric && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="h-4 w-4" />
                    Chart Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">
                      Metric Name
                    </label>
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

                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">
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
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-8 gap-1.5 rounded-none rounded-l-md border-r text-xs"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Bar
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="line"
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-8 gap-1.5 rounded-none rounded-r-md text-xs"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Line
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">
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
                          className={cn(
                            "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-8 rounded-none text-xs",
                            index === 0
                              ? "rounded-l-md border-r"
                              : index === CADENCE_OPTIONS.length - 1
                                ? "rounded-r-md"
                                : "border-r",
                          )}
                        >
                          {cadence.charAt(0) + cadence.slice(1).toLowerCase()}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>

                  <Collapsible
                    open={isAdvancedOpen}
                    onOpenChange={setIsAdvancedOpen}
                  >
                    <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 text-xs font-medium transition-colors">
                      <ChevronRight
                        className={cn(
                          "h-3 w-3 transition-transform",
                          isAdvancedOpen && "rotate-90",
                        )}
                      />
                      AI Prompt
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <Textarea
                        placeholder="Custom prompt: 'show trends', 'group by category'..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isProcessing}
                        className="min-h-[60px] resize-none text-xs"
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <Button
                    variant={hasChartChanges ? "default" : "outline"}
                    size="sm"
                    onClick={handleApplyChanges}
                    disabled={isProcessing || !hasChartChanges}
                    className="h-8 w-full text-xs"
                  >
                    {isProcessing ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Apply Changes
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Actions Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <RefreshCw className="h-4 w-4" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isIntegrationMetric && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRefresh}
                      disabled={isProcessing || isRegeneratingPipeline}
                      className="h-8 w-full text-xs"
                    >
                      <RefreshCw
                        className={cn(
                          "mr-1.5 h-3.5 w-3.5",
                          isProcessing && "animate-spin",
                        )}
                      />
                      Refresh Data
                    </Button>

                    <Separator />

                    {/* Regenerate Pipeline Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-medium">
                            Regenerate Pipeline
                          </Label>
                          <p className="text-muted-foreground text-[10px]">
                            Re-run AI to recreate transformers
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={onRegeneratePipeline}
                        disabled={isProcessing || isRegeneratingPipeline}
                        className="h-8 w-full text-xs"
                      >
                        {isRegeneratingPipeline ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Regenerate Transformers
                      </Button>
                    </div>

                    <Separator />
                  </>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 w-full text-xs"
                >
                  {isDeleting ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Delete Metric
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>

      <DrawerFooter className="border-t pt-4">
        <DrawerClose asChild>
          <Button variant="outline">Close</Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  );
}
