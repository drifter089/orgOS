/**
 * Period calculation utilities for manual metrics
 * Handles daily, weekly, and monthly period boundaries
 */

export type Cadence = "daily" | "weekly" | "monthly";

export interface Period {
  start: Date;
  end: Date;
  label: string;
  /** Timestamp to use when storing data point (end of period) */
  timestamp: Date;
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday is day 0 (ISO week starts on Monday)
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the week (Sunday) for a given date
 */
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Format a date range for weekly display (e.g., "Dec 2 - Dec 8")
 */
function formatWeekRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

/**
 * Get the current period based on cadence
 */
export function getCurrentPeriod(cadence: Cadence): Period {
  const now = new Date();

  switch (cadence) {
    case "daily": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end,
        label: now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        timestamp: end,
      };
    }

    case "weekly": {
      const start = getWeekStart(now);
      const end = getWeekEnd(now);
      return {
        start,
        end,
        label: formatWeekRange(start, end),
        timestamp: end,
      };
    }

    case "monthly": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end,
        label: now.toLocaleDateString("en-US", { month: "short" }),
        timestamp: end,
      };
    }
  }
}

/**
 * Get the period for a specific date based on cadence
 */
export function getPeriodForDate(cadence: Cadence, date: Date): Period {
  switch (cadence) {
    case "daily": {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end,
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        timestamp: end,
      };
    }

    case "weekly": {
      const start = getWeekStart(date);
      const end = getWeekEnd(date);
      return {
        start,
        end,
        label: formatWeekRange(start, end),
        timestamp: end,
      };
    }

    case "monthly": {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end,
        label: date.toLocaleDateString("en-US", { month: "short" }),
        timestamp: end,
      };
    }
  }
}

/**
 * Get previous periods based on cadence (most recent first)
 * @param cadence - The cadence type
 * @param count - Number of periods to return (including current)
 */
export function getPeriods(cadence: Cadence, count: number): Period[] {
  const periods: Period[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    let periodDate: Date;

    switch (cadence) {
      case "daily":
        periodDate = new Date(now);
        periodDate.setDate(periodDate.getDate() - i);
        break;

      case "weekly":
        periodDate = new Date(now);
        periodDate.setDate(periodDate.getDate() - i * 7);
        break;

      case "monthly":
        periodDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        break;
    }

    periods.push(getPeriodForDate(cadence, periodDate));
  }

  return periods;
}

/**
 * Check if a timestamp falls within a period
 */
export function isInPeriod(timestamp: Date, period: Period): boolean {
  return timestamp >= period.start && timestamp <= period.end;
}

/**
 * Find which period a timestamp belongs to from a list of periods
 */
export function findPeriodForTimestamp(
  timestamp: Date,
  periods: Period[],
): Period | undefined {
  return periods.find((period) => isInPeriod(timestamp, period));
}
