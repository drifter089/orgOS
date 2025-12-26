"use client";

import * as React from "react";

import { endOfMonth, format, isSameMonth, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MonthRange {
  start: Date;
  end: Date;
}

interface MonthPickerProps {
  selected: MonthRange[];
  onSelect: (months: MonthRange[]) => void;
  /** Minimum number of months that must be selected */
  min?: number;
  /** Maximum number of months that can be selected */
  max?: number;
  className?: string;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function MonthPicker({
  selected,
  onSelect,
  min = 1,
  max = 12,
  className,
}: MonthPickerProps) {
  const [year, setYear] = React.useState(() => new Date().getFullYear());

  const isSelected = (monthIndex: number, yearValue: number) => {
    const monthDate = new Date(yearValue, monthIndex, 1);
    return selected.some((s) => isSameMonth(s.start, monthDate));
  };

  const isCurrent = (monthIndex: number, yearValue: number) => {
    const now = new Date();
    return now.getMonth() === monthIndex && now.getFullYear() === yearValue;
  };

  const toggleMonth = (monthIndex: number, yearValue: number) => {
    const monthStart = startOfMonth(new Date(yearValue, monthIndex, 1));
    const monthEnd = endOfMonth(monthStart);
    const alreadySelected = isSelected(monthIndex, yearValue);

    if (alreadySelected) {
      if (selected.length <= min) return;
      onSelect(selected.filter((s) => !isSameMonth(s.start, monthStart)));
    } else {
      if (selected.length >= max) return;
      const newSelected = [...selected, { start: monthStart, end: monthEnd }];
      newSelected.sort((a, b) => a.start.getTime() - b.start.getTime());
      onSelect(newSelected);
    }
  };

  const getSelectionSummary = () => {
    if (selected.length === 0) return "No months selected";
    const first = selected[0];
    if (!first) return "No months selected";
    if (selected.length === 1) {
      return format(first.start, "MMM yyyy");
    }
    const last = selected[selected.length - 1];
    if (!last) return format(first.start, "MMM yyyy");
    return `${format(first.start, "MMM yyyy")} - ${format(last.start, "MMM yyyy")}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Year Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setYear((y) => y - 1)}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{year}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setYear((y) => y + 1)}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-4 gap-2">
        {MONTHS.map((month, index) => {
          const monthSelected = isSelected(index, year);
          const monthCurrent = isCurrent(index, year);

          return (
            <button
              key={month}
              type="button"
              onClick={() => toggleMonth(index, year)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm transition-colors",
                monthSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted border-border",
                monthCurrent &&
                  !monthSelected &&
                  "border-primary/50 bg-primary/5",
              )}
            >
              {month}
              {monthCurrent && (
                <span className="ml-1 text-xs opacity-70">*</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection summary */}
      <p className="text-muted-foreground text-center text-sm">
        {selected.length} month{selected.length !== 1 ? "s" : ""} selected
        {selected.length > 0 && (
          <span className="block text-xs">{getSelectionSummary()}</span>
        )}
      </p>
    </div>
  );
}

export { MonthPicker };
