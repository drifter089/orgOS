"use client";

import * as React from "react";

import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { MonthPicker, type MonthRange } from "@/components/ui/month-picker";
import { WeekPicker, type WeekRange } from "@/components/ui/week-picker";

type Cadence = "daily" | "weekly" | "monthly";

export interface PeriodRange {
  startDate: Date;
  endDate: Date;
}

interface PeriodRangeStepProps {
  cadence: Cadence;
  value: PeriodRange | null;
  onChange: (range: PeriodRange) => void;
}

export function PeriodRangeStep({
  cadence,
  value,
  onChange,
}: PeriodRangeStepProps) {
  // Daily: use date range
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => {
      if (value && cadence === "daily") {
        return { from: value.startDate, to: value.endDate };
      }
      // Default: 1 week ago to 1 week from now
      return {
        from: subDays(new Date(), 7),
        to: addDays(new Date(), 7),
      };
    },
  );

  // Weekly: use week ranges
  const [weekRanges, setWeekRanges] = React.useState<WeekRange[]>(() => {
    if (value && cadence === "weekly") {
      // Convert to week ranges - for now just use the range as single selection
      const weeks: WeekRange[] = [];
      let current = startOfWeek(value.startDate, { weekStartsOn: 1 });
      const end = value.endDate;
      while (current <= end) {
        weeks.push({
          start: current,
          end: endOfWeek(current, { weekStartsOn: 1 }),
        });
        current = addWeeks(current, 1);
      }
      return weeks;
    }
    // Default: current week + 2 previous + 2 future
    const now = new Date();
    return [
      {
        start: startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 }),
        end: endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 }),
      },
      {
        start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
        end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
      },
      {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      },
      {
        start: startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }),
        end: endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }),
      },
      {
        start: startOfWeek(addWeeks(now, 2), { weekStartsOn: 1 }),
        end: endOfWeek(addWeeks(now, 2), { weekStartsOn: 1 }),
      },
    ];
  });

  // Monthly: use month ranges
  const [monthRanges, setMonthRanges] = React.useState<MonthRange[]>(() => {
    if (value && cadence === "monthly") {
      const months: MonthRange[] = [];
      let current = startOfMonth(value.startDate);
      const end = value.endDate;
      while (current <= end) {
        months.push({
          start: current,
          end: endOfMonth(current),
        });
        current = addMonths(current, 1);
      }
      return months;
    }
    // Default: current month + 2 previous + 2 future
    const now = new Date();
    return [
      {
        start: startOfMonth(subMonths(now, 2)),
        end: endOfMonth(subMonths(now, 2)),
      },
      {
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(subMonths(now, 1)),
      },
      { start: startOfMonth(now), end: endOfMonth(now) },
      {
        start: startOfMonth(addMonths(now, 1)),
        end: endOfMonth(addMonths(now, 1)),
      },
      {
        start: startOfMonth(addMonths(now, 2)),
        end: endOfMonth(addMonths(now, 2)),
      },
    ];
  });

  // Update parent when selection changes
  React.useEffect(() => {
    if (cadence === "daily" && dateRange?.from && dateRange?.to) {
      onChange({ startDate: dateRange.from, endDate: dateRange.to });
    }
  }, [cadence, dateRange, onChange]);

  React.useEffect(() => {
    if (cadence === "weekly" && weekRanges.length > 0) {
      const sorted = [...weekRanges].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (first && last) {
        onChange({
          startDate: first.start,
          endDate: last.end,
        });
      }
    }
  }, [cadence, weekRanges, onChange]);

  React.useEffect(() => {
    if (cadence === "monthly" && monthRanges.length > 0) {
      const sorted = [...monthRanges].sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (first && last) {
        onChange({
          startDate: first.start,
          endDate: last.end,
        });
      }
    }
  }, [cadence, monthRanges, onChange]);

  const getDescription = () => {
    switch (cadence) {
      case "daily":
        return "select the date range for tracking";
      case "weekly":
        return "select the weeks you want to track";
      case "monthly":
        return "select the months you want to track";
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold">tracking period</h3>
        <p className="text-muted-foreground mt-1 text-sm">{getDescription()}</p>
      </div>

      <div className="flex justify-center">
        {cadence === "daily" && (
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            className="rounded-md border"
          />
        )}

        {cadence === "weekly" && (
          <WeekPicker
            selected={weekRanges}
            onSelect={setWeekRanges}
            min={1}
            max={12}
            weeksToShow={8}
          />
        )}

        {cadence === "monthly" && (
          <MonthPicker
            selected={monthRanges}
            onSelect={setMonthRanges}
            min={1}
            max={12}
          />
        )}
      </div>
    </div>
  );
}
