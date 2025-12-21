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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-900",
        icon: <TrendingUp className="h-4 w-4" />,
        label: "On Track",
        gradient: "from-emerald-400 to-emerald-500",
      };
    case "behind":
      return {
        bg: "bg-red-50 dark:bg-red-950/30",
        text: "text-red-700 dark:text-red-400",
        border: "border-red-200 dark:border-red-900",
        icon: <AlertTriangle className="h-4 w-4" />,
        label: "Behind",
        gradient: "from-red-400 to-red-500",
      };
    case "at_risk":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-900",
        icon: <AlertTriangle className="h-4 w-4" />,
        label: "At Risk",
        gradient: "from-amber-400 to-amber-500",
      };
    default:
      return {
        bg: "bg-gray-50 dark:bg-muted",
        text: "text-gray-700 dark:text-muted-foreground",
        border: "border-gray-200 dark:border-border",
        icon: null,
        label: "No Goal",
        gradient: "from-gray-300 to-gray-400",
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
    <div className="dark:bg-background flex h-full flex-col bg-white">
      {/* 1. Header Section */}
      <div className="dark:border-border border-b border-gray-100 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="dark:text-foreground text-lg font-semibold text-gray-900">
                {metricName}
              </h2>
              {platformConfig && (
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
                    platformConfig.bgColor,
                    platformConfig.textColor,
                  )}
                >
                  {platformConfig.name}
                </span>
              )}
            </div>
            <div className="dark:text-muted-foreground flex items-center gap-2 text-sm text-gray-500">
              {lastFetchedAt && (
                <span>
                  Updated{" "}
                  {formatDistanceToNow(new Date(lastFetchedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
              {isProcessing && (
                <span className="text-primary flex items-center gap-1">
                  <span className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
                  Syncing...
                </span>
              )}
            </div>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="dark:hover:bg-muted h-8 w-8 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-400" />
            </Button>
          </DrawerClose>
        </div>
      </div>

      {/* 2. Progress Hero Section */}
      <div className="dark:border-border border-b border-gray-100 px-5 py-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <span className="dark:text-foreground text-4xl font-bold text-gray-900">
              {currentValue ? formatValue(currentValue.value) : "--"}
            </span>
            <span className="dark:text-muted-foreground/50 text-2xl font-medium text-gray-400">
              {" / "}
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
                "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium",
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

        {/* Progress bar */}
        <div className="relative">
          <div className="dark:bg-muted h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                statusStyles.gradient,
              )}
              style={{
                width: `${Math.min(goalProgress?.progressPercent ?? 0, 100)}%`,
              }}
            />
          </div>
          <div className="dark:text-muted-foreground mt-2 flex justify-between text-xs text-gray-500">
            <span>
              {goalProgress
                ? `${Math.round(goalProgress.progressPercent)}% complete`
                : "No progress data"}
            </span>
            {goalProgress && (
              <span>
                {goalProgress.daysRemaining}d left •{" "}
                {format(new Date(goalProgress.periodEnd), "MMM d")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="dark:border-border border-b border-gray-100 px-5">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none bg-transparent p-0">
            {["overview", "history", "settings"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="dark:text-muted-foreground dark:hover:text-foreground dark:data-[state=active]:border-foreground dark:data-[state=active]:text-foreground relative rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-gray-500 capitalize hover:text-gray-700 data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 data-[state=active]:shadow-none"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* 4. Tab Content */}
        <div className="dark:bg-background flex-1 overflow-y-auto bg-white p-5">
          <TabsContent value="overview" className="mt-0 space-y-5">
            {/* Mini Chart Card */}
            <div className="dark:bg-muted/30 rounded-xl bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="dark:text-foreground text-sm font-medium text-gray-700">
                  Trend Analysis
                </span>
                <div className="dark:border-border dark:bg-card flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
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
                        "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                        selectedCadence === c
                          ? "dark:bg-primary dark:text-primary-foreground bg-gray-900 text-white"
                          : "dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground text-gray-500 hover:bg-gray-100 hover:text-gray-900",
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

            {/* Details List */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                Details
              </h3>

              <div className="space-y-1">
                <div className="dark:border-border flex items-center justify-between border-b border-gray-100 py-3">
                  <span className="dark:text-muted-foreground text-sm text-gray-500">
                    Tracked Field
                  </span>
                  {chartTransform?.dataKeys &&
                  chartTransform.dataKeys.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {chartTransform.dataKeys.map((key) => (
                        <span
                          key={key}
                          className="dark:bg-muted dark:text-foreground rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-900"
                        >
                          {chartTransform.chartConfig?.[key]?.label ?? key}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">--</span>
                  )}
                </div>

                <div className="dark:border-border flex items-center justify-between border-b border-gray-100 py-3">
                  <span className="dark:text-muted-foreground text-sm text-gray-500">
                    Owner
                  </span>
                  {assignedRole ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-500 text-sm font-medium text-white">
                          {assignedRole.title.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-right">
                        <p className="dark:text-foreground text-sm font-medium text-gray-900">
                          {assignedRole.title}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Unassigned</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="dark:text-muted-foreground text-sm text-gray-500">
                    Data Source
                  </span>
                  {platformConfig ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-orange-100 dark:bg-orange-900/30">
                        <span className="text-xs">📊</span>
                      </div>
                      <span className="dark:text-foreground text-sm font-medium text-gray-900">
                        {platformConfig.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Manual</span>
                  )}
                </div>
              </div>
            </div>

            {/* AI Insights Collapsible */}
            {isIntegrationMetric && (
              <Collapsible
                open={isAIInsightsOpen}
                onOpenChange={setIsAIInsightsOpen}
                className="dark:border-border overflow-hidden rounded-xl border border-gray-200"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="dark:hover:bg-muted/50 flex w-full items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      <span className="dark:text-foreground text-sm font-medium text-gray-900">
                        AI Insights
                      </span>
                      <span className="text-xs text-gray-400">
                        Ask questions about this metric
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-gray-400 transition-transform duration-200",
                        isAIInsightsOpen && "rotate-180",
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="dark:border-border dark:bg-muted/30 border-t border-gray-100 bg-gray-50 p-4">
                  <div className="space-y-3">
                    <Label className="dark:text-muted-foreground text-xs font-medium text-gray-500">
                      Customize Chart Data
                    </Label>
                    <Textarea
                      placeholder="e.g., 'Group by user', 'Show cumulative growth'..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="dark:border-border dark:bg-background min-h-[80px] resize-none border-gray-200 bg-white text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleApplyAIChanges}
                      disabled={isProcessing}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Processing...
                        </span>
                      ) : (
                        "Apply Changes"
                      )}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0 space-y-4">
            <div className="dark:border-border rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <BarChart3 className="dark:text-muted-foreground/50 mx-auto h-8 w-8 text-gray-300" />
              <p className="dark:text-muted-foreground mt-2 text-sm text-gray-500">
                Detailed history view is coming soon.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0 space-y-8">
            <div className="space-y-4">
              <h3 className="dark:text-foreground text-sm font-semibold text-gray-900">
                General
              </h3>
              <div className="space-y-3">
                <Label htmlFor="metric-name">Metric Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="metric-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-lg"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="rounded-lg"
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
                <div className="space-y-4">
                  <h3 className="dark:text-foreground text-sm font-semibold text-gray-900">
                    Goals
                  </h3>
                  <GoalEditor
                    metricId={metricId}
                    initialGoal={goal}
                    cadence={currentCadence}
                    compact={false}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="dark:text-foreground text-sm font-semibold text-gray-900">
                    Assignment
                  </h3>
                  <RoleAssignment
                    metricId={metricId}
                    metricName={metricName}
                    teamId={teamId}
                    assignedRoleIds={roles.map((r) => r.id)}
                  />
                </div>
              </>
            )}

            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-semibold text-red-600">
                Danger Zone
              </h3>
              <Button
                variant="outline"
                className="w-full justify-start rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/20"
                onClick={onDelete}
              >
                Delete Metric
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* 5. Footer Actions */}
      <div className="dark:border-border dark:bg-muted/10 border-t border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex gap-3">
          <Button
            className="dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 flex-1 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
            onClick={() => setActiveTab("settings")}
          >
            {activeTab === "settings" ? "Editing Settings" : "Edit Metric"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="dark:bg-background dark:hover:bg-muted rounded-lg bg-white hover:bg-gray-100"
              >
                <MoreVertical className="dark:text-muted-foreground h-5 w-5 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-lg">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                Delete Metric
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
