"use client";

import { useEffect, useState } from "react";

import type { Cadence } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Check,
  Loader2,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getDimensionDisplayLabel } from "@/lib/metrics/dimension-labels";
import { cn } from "@/lib/utils";

const CADENCE_OPTIONS: Cadence[] = ["DAILY", "WEEKLY", "MONTHLY"];

interface SettingsTabContentProps {
  metricName: string;
  metricDescription: string | null;
  selectedChartType: string;
  setSelectedChartType: (v: string) => void;
  selectedCadence: Cadence;
  setSelectedCadence: (v: Cadence) => void;
  selectedDimension: string;
  setSelectedDimension: (v: string) => void;
  availableDimensions: string[] | undefined;
  isDimensionsLoading: boolean;
  isIntegrationMetric: boolean;
  valueLabel: string | null;
  hasChartChanges: boolean;
  isProcessing: boolean;
  isDeleting: boolean;
  lastFetchedAt: Date | null;
  onApplyChanges: () => void;
  onRefresh: (forceRebuild?: boolean) => void;
  onDelete: () => void;
  onUpdateMetric: (name: string, description: string) => void;
}

export function SettingsTabContent({
  metricName,
  metricDescription,
  selectedChartType,
  setSelectedChartType,
  selectedCadence,
  setSelectedCadence,
  selectedDimension,
  setSelectedDimension,
  availableDimensions,
  isDimensionsLoading,
  isIntegrationMetric,
  valueLabel,
  hasChartChanges,
  isProcessing,
  isDeleting,
  lastFetchedAt,
  onApplyChanges,
  onRefresh,
  onDelete,
  onUpdateMetric,
}: SettingsTabContentProps) {
  const [name, setName] = useState(metricName);
  const [hasNameChanges, setHasNameChanges] = useState(false);

  useEffect(() => {
    if (!hasNameChanges) {
      setName(metricName);
    }
  }, [metricName, hasNameChanges]);

  const handleNameChange = (value: string) => {
    setHasNameChanges(true);
    setName(value);
  };

  const handleSaveName = () => {
    if (name.trim() && name !== metricName) {
      onUpdateMetric(name.trim(), metricDescription ?? "");
    }
    setHasNameChanges(false);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <h3 className="mb-4 text-sm font-semibold">Settings</h3>

      <div className="space-y-5">
        {/* Metric Name */}
        <div className="space-y-2">
          <Label className="text-xs">Metric Name</Label>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0"
              onClick={handleSaveName}
              disabled={!hasNameChanges || !name.trim() || name === metricName}
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Chart Type */}
        <div className="space-y-2">
          <Label className="text-xs">Chart Type</Label>
          <ToggleGroup
            type="single"
            value={selectedChartType}
            onValueChange={(v) => v && setSelectedChartType(v)}
            className="grid w-full grid-cols-2 gap-2"
          >
            <ToggleGroupItem
              value="bar"
              aria-label="Bar Chart"
              className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border"
            >
              <BarChart3 className="mr-1.5 h-4 w-4" />
              Bar
            </ToggleGroupItem>
            <ToggleGroupItem
              value="line"
              aria-label="Line Chart"
              className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border"
            >
              <TrendingUp className="mr-1.5 h-4 w-4" />
              Line
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Cadence */}
        <div className="space-y-2">
          <Label className="text-xs">Cadence</Label>
          <ToggleGroup
            type="single"
            value={selectedCadence}
            onValueChange={(v) => v && setSelectedCadence(v as Cadence)}
            className="grid w-full grid-cols-3 gap-2"
          >
            {CADENCE_OPTIONS.map((c) => (
              <ToggleGroupItem
                key={c}
                value={c}
                className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border text-xs"
              >
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Dimensions */}
        {isIntegrationMetric && (
          <div className="space-y-2">
            <Label className="text-xs">Dimension</Label>
            {isDimensionsLoading ? (
              <div className="flex h-8 items-center justify-center rounded-md border">
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              </div>
            ) : availableDimensions && availableDimensions.length > 0 ? (
              <Select
                value={selectedDimension}
                onValueChange={setSelectedDimension}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select dimension" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">
                    {valueLabel ?? "Primary Value"}
                  </SelectItem>
                  {availableDimensions.map((dim) => (
                    <SelectItem key={dim} value={dim}>
                      {getDimensionDisplayLabel(dim)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-muted-foreground h-8 rounded-md border px-3 py-1.5 text-sm">
                No dimensions available
              </div>
            )}
          </div>
        )}

        {/* Apply Changes */}
        <Button
          size="sm"
          onClick={onApplyChanges}
          disabled={isProcessing || !hasChartChanges}
          className="w-full"
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BarChart3 className="mr-2 h-4 w-4" />
          )}
          Apply Changes
        </Button>

        {/* Refresh Controls */}
        <div className="space-y-2">
          <Label className="text-xs">Data Refresh</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefresh(false)}
              disabled={isProcessing}
            >
              <RefreshCw
                className={cn("mr-1 h-3 w-3", isProcessing && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefresh(true)}
              disabled={isProcessing}
            >
              <RefreshCw
                className={cn("mr-1 h-3 w-3", isProcessing && "animate-spin")}
              />
              Hard
            </Button>
          </div>
          {lastFetchedAt && (
            <div className="text-muted-foreground text-[10px]">
              Last fetched{" "}
              {formatDistanceToNow(new Date(lastFetchedAt), {
                addSuffix: true,
              })}
            </div>
          )}
        </div>

        {/* Delete Metric */}
        <div className="border-t pt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="w-full"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Metric
          </Button>
        </div>
      </div>
    </div>
  );
}
