"use client";

import { useEffect, useState } from "react";

import type { Cadence } from "@prisma/client";
import { BarChart3, Check, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

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
  onApplyChanges: () => void;
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
  onApplyChanges,
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
      toast.success("Metric name updated");
    }
    setHasNameChanges(false);
  };

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-5">
        <h3 className="text-base font-semibold">Settings</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Configure how this metric is displayed and set the tracking cadence.
        </p>
      </div>

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

        {/* Chart Type - only for integration metrics */}
        {isIntegrationMetric && (
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
        )}

        {/* Cadence - only for integration metrics */}
        {isIntegrationMetric && (
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
        )}

        {/* Manual metric info */}
        {!isIntegrationMetric && (
          <div className="bg-muted/50 rounded-md border p-3">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Chart type and cadence are set when creating a manual metric and
              match the check-in periods. To change these settings, create a new
              metric with your preferred configuration.
            </p>
          </div>
        )}

        {/* Dimensions - only for integration metrics */}
        {isIntegrationMetric && (
          <div className="space-y-2">
            <Label className="text-xs">Dimension</Label>
            {isDimensionsLoading ? (
              <div className="flex h-8 items-center justify-center border">
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
              <div className="text-muted-foreground h-8 border px-3 py-1.5 text-sm">
                No dimensions available
              </div>
            )}
          </div>
        )}

        {/* Apply Changes - only for integration metrics */}
        {isIntegrationMetric && (
          <Button
            size="sm"
            onClick={onApplyChanges}
            disabled={isProcessing || !hasChartChanges}
            className="w-full transition-all duration-200 active:scale-[0.98]"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="mr-2 h-4 w-4" />
            )}
            Apply Changes
          </Button>
        )}
      </div>
    </div>
  );
}
