"use client";

import { useEffect, useState } from "react";

import type { Cadence, MetricGoal, Role } from "@prisma/client";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronDown,
  Clock,
  MoreVertical,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

import { GoalEditor } from "@/components/metric/goal-editor";
import { RoleAssignment } from "@/components/metric/role-assignment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DrawerClose } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  onRefresh: (forceRebuild?: boolean) => void;
  onUpdateMetric: (name: string, description: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

function getStatusStyles(status?: string) {
  switch (status) {
    case "exceeded":
    case "on_track":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/20",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-800",
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        label: "On Track",
        bar: "bg-emerald-500",
      };
    case "behind":
      return {
        bg: "bg-red-50 dark:bg-red-950/20",
        text: "text-red-700 dark:text-red-400",
        border: "border-red-200 dark:border-red-800",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: "Behind",
        bar: "bg-red-500",
      };
    case "at_risk":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/20",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-800",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: "At Risk",
        bar: "bg-amber-500",
      };
    default:
      return {
        bg: "bg-muted/50",
        text: "text-muted-foreground",
        border: "border-border",
        icon: null,
        label: "No Goal",
        bar: "bg-muted-foreground/30",
      };
  }
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
  lastError: _lastError,
  pollFrequency: _pollFrequency,
  goal,
  goalProgress,
  isProcessing,
  isUpdating: _isUpdating,
  isDeleting: _isDeleting,
  isRegeneratingPipeline,
  loadingPhase,
  onRegenerate,
  onRefresh: _onRefresh,
  onUpdateMetric,
  onDelete,
  onClose: _onClose,
}: DashboardMetricDrawerProps) {
  const [name, setName] = useState(metricName);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCadence, setSelectedCadence] = useState<Cadence>(
    currentCadence ?? "WEEKLY",
  );
  const [prompt, setPrompt] = useState("");
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false);

  useEffect(() => {
    setName(metricName);
  }, [metricName]);

  useEffect(() => {
    if (currentCadence) setSelectedCadence(currentCadence);
  }, [currentCadence]);

  const hasNameChanges = name !== metricName;

  const handleSaveName = () => {
    if (hasNameChanges && name.trim()) {
      onUpdateMetric(name.trim(), metricDescription ?? "");
    }
  };

  const handleApplyAIChanges = () => {
    onRegenerate(currentChartType ?? "bar", selectedCadence, prompt);
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
  const statusStyles = getStatusStyles(goalProgress?.status);

  // Derive owner from roles
  const assignedRole = roles.length > 0 ? roles[0] : null;

  return (
    <div className="bg-background text-foreground flex h-full flex-col font-sans transition-colors duration-300">
      {/* 1. Header Section - Minimalist & Pure Grid */}
      <div className="border-b px-6 py-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-medium tracking-tight">
                {metricName}
              </h2>
              {platformConfig && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "rounded-none border px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase transition-colors",
                    platformConfig.bgColor,
                    platformConfig.textColor,
                    "border-foreground/10",
                  )}
                >
                  {platformConfig.name}
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-3 text-xs tracking-wide">
              {lastFetchedAt && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(lastFetchedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
              {isProcessing && (
                <span className="text-primary flex items-center gap-1.5">
                  <span className="bg-primary h-1.5 w-1.5 animate-pulse" />
                  SYNCING
                </span>
              )}
            </div>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted hover:text-foreground h-9 w-9 rounded-none transition-all"
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerClose>
        </div>
      </div>

      {/* 2. Progress Hero Section - Ma (Space) & Bold Typography */}
      <div className="border-b px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold tracking-tighter">
              {currentValue ? formatValue(currentValue.value) : "--"}
            </span>
            <span className="text-muted-foreground/40 text-2xl font-light">
              /{" "}
              {goal
                ? goal.goalType === "ABSOLUTE"
                  ? formatValue(goalTargetValue ?? goal.targetValue)
                  : `+${goal.targetValue}%`
                : "--"}
            </span>
          </div>
          {goalProgress && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-none border px-4 py-1.5 text-xs font-bold tracking-widest uppercase",
                statusStyles.bg,
                statusStyles.text,
                statusStyles.border,
              )}
            >
              {statusStyles.icon}
              {statusStyles.label}
            </div>
          )}
        </div>

        {/* Progress bar - Strict Grid, No Rounding */}
        <div className="relative space-y-3">
          <div className="border-foreground/5 bg-muted/30 h-3 w-full border p-[1px]">
            <div
              className={cn(
                "h-full transition-all duration-700 ease-in-out",
                statusStyles.bar,
              )}
              style={{
                width: `${Math.min(goalProgress?.progressPercent ?? 0, 100)}%`,
              }}
            />
          </div>
          <div className="text-muted-foreground/70 flex justify-between text-[11px] font-semibold tracking-widest uppercase">
            <span>
              {goalProgress
                ? `${Math.round(goalProgress.progressPercent)}% COMPLETE`
                : "NO PROGRESS DATA"}
            </span>
            {goalProgress && (
              <span>
                {goalProgress.daysRemaining}D LEFT •{" "}
                {format(
                  new Date(goalProgress.periodEnd),
                  "MMM d",
                ).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Tabs Navigation - Elegant Line Hierarchy */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b px-6">
          <TabsList className="h-auto w-full justify-start gap-8 rounded-none bg-transparent p-0">
            {["overview", "history", "settings"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground hover:text-foreground/80 relative rounded-none border-b-2 border-transparent px-0 py-4 text-xs font-bold tracking-[0.2em] uppercase transition-all data-[state=active]:shadow-none"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* 4. Tab Content - Gridlines Background */}
        <div className="gridlines-subtle flex-1 overflow-y-auto p-6">
          <TabsContent value="overview" className="mt-0 space-y-8">
            {/* Mini Chart Card - Clean Border, No Shadow */}
            <div className="bg-background/80 hover:border-foreground/20 border p-5 backdrop-blur-sm transition-all">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                  TREND ANALYSIS
                </span>
                <div className="border-foreground/10 bg-muted/20 flex border p-0.5">
                  {CADENCE_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setSelectedCadence(c);
                        onRegenerate(
                          currentChartType ?? "bar",
                          c,
                          prompt || undefined,
                        );
                      }}
                      className={cn(
                        "rounded-none px-3 py-1 text-[10px] font-bold tracking-widest transition-all",
                        selectedCadence === c
                          ? "bg-foreground text-background shadow-none"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                      )}
                    >
                      {c.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[200px] w-full">
                <DashboardMetricChart
                  title=""
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
            </div>

            {/* Details List - Strict Row Grid */}
            <div className="space-y-0">
              <h3 className="text-muted-foreground/50 mb-4 text-[11px] font-bold tracking-[0.25em] uppercase">
                METRIC SPECIFICATIONS
              </h3>

              <div className="border-foreground/5 hover:bg-muted/10 flex items-center justify-between border-b py-4 transition-colors">
                <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  Tracked Field
                </span>
                {chartTransform?.dataKeys &&
                chartTransform.dataKeys.length > 0 ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {chartTransform.dataKeys.map((key) => (
                      <Badge
                        key={key}
                        variant="outline"
                        className="border-foreground/10 bg-muted/10 rounded-none text-[10px] font-bold tracking-wider"
                      >
                        {(
                          chartTransform.chartConfig?.[key]?.label ?? key
                        ).toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground/30 text-sm font-bold">
                    --
                  </span>
                )}
              </div>

              <div className="border-foreground/5 hover:bg-muted/10 flex items-center justify-between border-b py-4 transition-colors">
                <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  Responsibility
                </span>
                {assignedRole ? (
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center text-[11px] font-bold">
                      {assignedRole.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-right">
                      <p className="text-foreground text-xs font-bold tracking-wide uppercase">
                        {assignedRole.title}
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground/30 text-xs font-bold tracking-widest uppercase">
                    UNASSIGNED
                  </span>
                )}
              </div>

              <div className="hover:bg-muted/10 flex items-center justify-between py-4 transition-colors">
                <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  Origin
                </span>
                {platformConfig ? (
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-xs font-bold tracking-widest uppercase">
                      {platformConfig.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                    MANUAL ENTRY
                  </span>
                )}
              </div>
            </div>

            {/* AI Insights Collapsible - Minimal Border, Muted */}
            {isIntegrationMetric && (
              <Collapsible
                open={isAIInsightsOpen}
                onOpenChange={setIsAIInsightsOpen}
                className="border-foreground/10 bg-background/50 border backdrop-blur-sm"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hover:bg-muted/30 flex w-full items-center justify-between rounded-none p-5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="text-primary h-4 w-4" />
                      <span className="text-xs font-bold tracking-widest uppercase">
                        AI Configuration
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground h-4 w-4 transition-transform duration-300",
                        isAIInsightsOpen && "rotate-180",
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-foreground/5 border-t p-5">
                  <div className="space-y-4">
                    <Label className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">
                      TRANSFORMATION QUERY
                    </Label>
                    <Textarea
                      placeholder="e.g., 'Group by user', 'Show cumulative growth'..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="bg-muted/10 focus:bg-background min-h-[100px] rounded-none border-dashed text-xs tracking-wide"
                    />
                    <Button
                      size="sm"
                      onClick={handleApplyAIChanges}
                      disabled={isProcessing}
                      className="w-full rounded-none font-bold tracking-widest uppercase"
                    >
                      {isProcessing ? "PROCESSING..." : "APPLY CHANGES"}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <div className="border-foreground/10 bg-muted/5 border border-dashed p-12 text-center">
              <BarChart3 className="text-muted-foreground/20 mx-auto h-10 w-10" />
              <p className="text-muted-foreground mt-4 text-xs font-bold tracking-[0.2em] uppercase">
                HISTORICAL DATA PENDING
              </p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 space-y-10">
            <div className="space-y-6">
              <h3 className="text-foreground/70 text-xs font-bold tracking-[0.25em] uppercase">
                GENERAL SETTINGS
              </h3>
              <div className="space-y-3">
                <Label
                  htmlFor="metric-name"
                  className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase"
                >
                  METRIC IDENTIFIER
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="metric-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-foreground/10 rounded-none"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="border-foreground/10 rounded-none"
                    onClick={handleSaveName}
                    disabled={!hasNameChanges || !name.trim()}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {teamId && (
              <>
                <div className="space-y-6">
                  <h3 className="text-foreground/70 text-xs font-bold tracking-[0.25em] uppercase">
                    PERFORMANCE GOALS
                  </h3>
                  <div className="border-foreground/5 bg-muted/5 border p-4">
                    <GoalEditor
                      metricId={metricId}
                      initialGoal={goal}
                      cadence={currentCadence}
                      compact={false}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-foreground/70 text-xs font-bold tracking-[0.25em] uppercase">
                    OWNERSHIP ASSIGNMENT
                  </h3>
                  <div className="border-foreground/5 bg-muted/5 border p-4">
                    <RoleAssignment
                      metricId={metricId}
                      metricName={metricName}
                      teamId={teamId}
                      assignedRoleIds={roles.map((r) => r.id)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-6 pt-6">
              <h3 className="text-xs font-bold tracking-[0.25em] text-red-600/70 uppercase">
                CRITICAL ACTIONS
              </h3>
              <Button
                variant="outline"
                className="w-full justify-start rounded-none border-red-200 text-xs font-bold tracking-[0.2em] text-red-600 uppercase transition-all hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:hover:bg-red-900/20"
                onClick={onDelete}
              >
                DELETE METRIC
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* 5. Footer Actions - Consistent Square Style */}
      <div className="bg-muted/10 border-t px-6 py-5">
        <div className="flex gap-4">
          <Button
            className="flex-1 rounded-none text-xs font-bold tracking-[0.2em] uppercase"
            onClick={() => setActiveTab("settings")}
            variant={activeTab === "settings" ? "secondary" : "default"}
          >
            {activeTab === "settings" ? "VIEWING SETTINGS" : "EDIT METRIC"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-none">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none border-2">
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive focus:text-destructive-foreground rounded-none text-xs font-bold tracking-widest uppercase"
                onClick={onDelete}
              >
                DELETE METRIC
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
