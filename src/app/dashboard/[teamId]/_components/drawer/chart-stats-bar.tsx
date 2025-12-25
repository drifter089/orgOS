"use client";

import { formatValue } from "@/lib/helpers/format-value";

interface ChartStatsBarProps {
  currentValue: { value: number; label?: string; date?: string } | null;
  valueLabel: string | null;
}

export function ChartStatsBar({
  currentValue,
  valueLabel,
}: ChartStatsBarProps) {
  return (
    <div className="bg-muted/30 flex items-center gap-6 border-b px-6 py-3">
      {/* Current Value */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">
          {currentValue ? formatValue(currentValue.value) : "--"}
        </span>
        {(valueLabel ?? currentValue?.label) && (
          <span className="text-muted-foreground text-sm">
            {valueLabel ?? currentValue?.label}
          </span>
        )}
      </div>
    </div>
  );
}
