"use client";

import * as React from "react";

import {
  addWeeks,
  endOfWeek,
  format,
  isSameWeek,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WeekRange {
  start: Date;
  end: Date;
}

interface WeekPickerProps {
  selected: WeekRange[];
  onSelect: (weeks: WeekRange[]) => void;
  /** Number of weeks to show in the grid */
  weeksToShow?: number;
  /** Minimum number of weeks that must be selected */
  min?: number;
  /** Maximum number of weeks that can be selected */
  max?: number;
  className?: string;
}

function getWeekLabel(start: Date, end: Date): string {
  const startMonth = format(start, "MMM");
  const endMonth = format(end, "MMM");
  const startDay = format(start, "d");
  const endDay = format(end, "d");

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

function WeekPicker({
  selected,
  onSelect,
  weeksToShow = 8,
  min = 1,
  max = 12,
  className,
}: WeekPickerProps) {
  // Start from 2 weeks ago
  const [baseDate, setBaseDate] = React.useState(() => subWeeks(new Date(), 2));

  const weeks = React.useMemo(() => {
    const result: WeekRange[] = [];
    for (let i = 0; i < weeksToShow; i++) {
      const weekDate = addWeeks(baseDate, i);
      result.push({
        start: startOfWeek(weekDate, { weekStartsOn: 1 }),
        end: endOfWeek(weekDate, { weekStartsOn: 1 }),
      });
    }
    return result;
  }, [baseDate, weeksToShow]);

  const isSelected = (week: WeekRange) => {
    return selected.some((s) =>
      isSameWeek(s.start, week.start, { weekStartsOn: 1 }),
    );
  };

  const isCurrent = (week: WeekRange) => {
    return isSameWeek(week.start, new Date(), { weekStartsOn: 1 });
  };

  const toggleWeek = (week: WeekRange) => {
    const alreadySelected = isSelected(week);

    if (alreadySelected) {
      // Don't allow deselecting if at minimum
      if (selected.length <= min) return;
      onSelect(
        selected.filter(
          (s) => !isSameWeek(s.start, week.start, { weekStartsOn: 1 }),
        ),
      );
    } else {
      // Don't allow selecting if at maximum
      if (selected.length >= max) return;
      // Sort by start date when adding
      const newSelected = [...selected, week].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      );
      onSelect(newSelected);
    }
  };

  const handlePrevious = () => {
    setBaseDate((prev) => subWeeks(prev, weeksToShow));
  };

  const handleNext = () => {
    setBaseDate((prev) => addWeeks(prev, weeksToShow));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground text-sm">
          {format(weeks[0]?.start ?? new Date(), "MMM yyyy")} -{" "}
          {format(weeks[weeks.length - 1]?.end ?? new Date(), "MMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-2 gap-2">
        {weeks.map((week) => {
          const weekSelected = isSelected(week);
          const weekCurrent = isCurrent(week);

          return (
            <button
              key={week.start.toISOString()}
              type="button"
              onClick={() => toggleWeek(week)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm transition-colors",
                weekSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted border-border",
                weekCurrent &&
                  !weekSelected &&
                  "border-primary/50 bg-primary/5",
              )}
            >
              {getWeekLabel(week.start, week.end)}
              {weekCurrent && (
                <span className="ml-1 text-xs opacity-70">(now)</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection count */}
      <p className="text-muted-foreground text-center text-sm">
        {selected.length} week{selected.length !== 1 ? "s" : ""} selected
      </p>
    </div>
  );
}

export { WeekPicker };
