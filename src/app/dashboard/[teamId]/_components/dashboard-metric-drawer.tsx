"use client";

import { useEffect, useState } from "react";

import type { Cadence, MetricGoal, Role } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  BarChart3,
  Bot,
  Check,
  Clock,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  RotateCcw,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

import { GoalEditor } from "@/components/metric/goal-editor";
import { RoleAssignment } from "@/components/metric/role-assignment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  isUpdating: _isUpdating,
  isDeleting,
  isRegeneratingPipeline,
  loadingPhase,
  onRegenerate,
  onRefresh,
  onRegeneratePipeline,
  onUpdateMetric,
  onDelete,
  onClose: _onClose,
}: DashboardMetricDrawerProps) {
  const [name, setName] = useState(metricName);
  const [selectedChartType, setSelectedChartType] = useState(
    currentChartType ?? "bar",
  );
  const [selectedCadence, setSelectedCadence] = useState<Cadence>(
    currentCadence ?? "WEEKLY",
  );
  const [prompt, setPrompt] = useState("");

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
    _onClose();
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
    <div className="flex h-full flex-col">
      <DrawerHeader className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DrawerTitle className="text-2xl">{metricName}</DrawerTitle>
              {platformConfig && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "gap-1",
                    platformConfig.bgColor,
                    platformConfig.textColor,
                  )}
                >
                  {platformConfig.name}
                </Badge>
              )}
            </div>
            <DrawerDescription className="flex items-center gap-3">
              {lastFetchedAt && (
                <span className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Updated{" "}
                  {formatDistanceToNow(new Date(lastFetchedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
              <span className="text-border">|</span>
              <span className="text-xs">
                Polls {pollFrequency.toLowerCase()}
              </span>
              {lastError && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                  Error
                </Badge>
              )}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerClose>
        </div>
      </DrawerHeader>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 p-6">
          {/* Hero Section: Chart & Key Stats */}
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Main Chart */}
            <Card className="flex flex-col overflow-hidden shadow-sm">
              <div className="bg-muted/30 border-b px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="text-muted-foreground h-4 w-4" />
                    Metric Performance
                  </h3>

                  {/* Chart Controls */}
                  {isIntegrationMetric && (
                    <div className="flex items-center gap-2">
                      <ToggleGroup
                        type="single"
                        value={selectedChartType}
                        onValueChange={(v) => v && setSelectedChartType(v)}
                        size="sm"
                      >
                        <ToggleGroupItem value="bar" aria-label="Bar Chart">
                          <BarChart3 className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="line" aria-label="Line Chart">
                          <TrendingUp className="h-4 w-4" />
                        </ToggleGroupItem>
                      </ToggleGroup>
                      <Separator orientation="vertical" className="h-6" />
                      <ToggleGroup
                        type="single"
                        value={selectedCadence}
                        onValueChange={(v) =>
                          v && setSelectedCadence(v as Cadence)
                        }
                        size="sm"
                      >
                        {CADENCE_OPTIONS.map((c) => (
                          <ToggleGroupItem
                            key={c}
                            value={c}
                            className="text-xs"
                          >
                            {c.charAt(0) + c.slice(1).toLowerCase()}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                  )}
                </div>
              </div>

              <CardContent className="p-0">
                <div className="bg-background h-[450px] w-full p-4">
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

            {/* Key Stats Side Panel */}
            <div className="flex flex-col gap-4">
              {/* Current Value Card */}
              <Card className="bg-primary/5 border-primary/20 shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">
                        Current Value
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-4xl font-bold tracking-tight">
                          {currentValue
                            ? formatValue(currentValue.value)
                            : "--"}
                        </span>
                        {valueLabel && (
                          <span className="text-muted-foreground text-sm">
                            {valueLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <Separator className="bg-primary/10" />

                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm font-medium">
                          Goal Target
                        </p>
                        <Target className="text-muted-foreground h-4 w-4" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-semibold">
                          {goalTargetValue !== null
                            ? formatValue(goalTargetValue)
                            : "--"}
                        </span>
                      </div>
                      {goalProgress && (
                        <div className="mt-2 space-y-1.5">
                          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                            <div
                              className={cn(
                                "h-full transition-all duration-500",
                                goalProgress.progressPercent >= 100
                                  ? "bg-green-500"
                                  : goalProgress.progressPercent >= 70
                                    ? "bg-blue-500"
                                    : "bg-amber-500",
                              )}
                              style={{
                                width: `${Math.min(goalProgress.progressPercent, 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-muted-foreground text-right text-xs">
                            {Math.round(goalProgress.progressPercent)}% of
                            target
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              {isIntegrationMetric && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-20 flex-col gap-2"
                      onClick={onRefresh}
                      disabled={isProcessing || isRegeneratingPipeline}
                    >
                      <RefreshCw
                        className={cn(
                          "h-5 w-5",
                          isProcessing && "animate-spin",
                        )}
                      />
                      <span className="text-xs">Refresh Data</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-20 flex-col gap-2"
                      onClick={() => handleApplyChanges()}
                      disabled={isProcessing || !hasChartChanges} // Enable if chart settings changed, actually re-generate needs changes
                    >
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <span className="text-xs">Regenerate</span>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Separator />

          {/* Configuration & Context Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Col 1: Chart Configuration */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-semibold">
                <Settings2 className="h-4 w-4" />
                Chart Configuration
              </h4>
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label className="text-xs">Metric Name</Label>
                    <div className="flex gap-2">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleSave}
                        disabled={!hasNameChanges || !name.trim()}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs">
                      <Bot className="h-3.5 w-3.5" />
                      AI Customization
                    </Label>
                    <Textarea
                      placeholder="E.g., 'Group by user', 'Show cumulative growth'..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleApplyChanges}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-3.5 w-3.5" />
                      )}
                      Apply Customization
                    </Button>
                  </div>

                  {chartTransform?.dataKeys && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-muted-foreground text-xs">
                        Tracked Fields
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {chartTransform.dataKeys.map((key) => (
                          <Badge
                            key={key}
                            variant="secondary"
                            className="text-[10px] font-normal"
                          >
                            {chartTransform.chartConfig?.[key]?.label ?? key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Col 2: Business Goals */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-semibold">
                <Target className="h-4 w-4" />
                Goals & Alignment
              </h4>
              {teamId && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pt-4 pb-3">
                      <CardTitle className="text-sm">Goal Definition</CardTitle>
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

                  <Card>
                    <CardHeader className="pt-4 pb-3">
                      <CardTitle className="text-sm">Role Assignment</CardTitle>
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
                </div>
              )}
            </div>

            {/* Col 3: Advanced & Data */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-semibold">
                <LayoutDashboard className="h-4 w-4" />
                Data Pipeline
              </h4>
              <Card>
                <CardContent className="space-y-4 pt-6">
                  {isIntegrationMetric && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Pipeline Health
                        </span>
                        <Badge
                          variant={lastError ? "destructive" : "outline"}
                          className="text-[10px]"
                        >
                          {lastError ? "Issue Detected" : "Healthy"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-4 text-xs">
                        If the data looks incorrect or the chart structure is
                        wrong, you can regenerate the entire ingestion pipeline.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={onRegeneratePipeline}
                        disabled={isRegeneratingPipeline}
                        className="h-8 w-full text-xs"
                      >
                        {isRegeneratingPipeline ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        )}
                        Rebuild Transformers
                      </Button>
                    </div>
                  )}

                  <div className="border-destructive/20 bg-destructive/5 rounded-md border p-3">
                    <span className="text-destructive text-sm font-medium">
                      Danger Zone
                    </span>
                    <p className="text-muted-foreground mt-1 mb-3 text-xs">
                      Permanently remove this metric and all its historical
                      data.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="h-8 w-full text-xs"
                    >
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                      )}
                      Delete Metric
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ScrollArea>

      <DrawerFooter className="border-t py-2">
        <div className="flex w-full items-center justify-between px-2">
          <span className="text-muted-foreground text-xs">
            Metric ID:{" "}
            <span className="font-mono">{metricId.slice(0, 8)}...</span>
          </span>
          <DrawerClose asChild>
            <Button variant="outline" size="sm">
              Close Drawer
            </Button>
          </DrawerClose>
        </div>
      </DrawerFooter>
    </div>
  );
}
