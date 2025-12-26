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
 * Get periods based on cadence (future first, then current, then past)
 * @param cadence - The cadence type
 * @param pastCount - Number of past periods to include
 * @param futureCount - Number of future periods to include (default 0)
 */
export function getPeriods(
  cadence: Cadence,
  pastCount: number,
  futureCount = 0,
): Period[] {
  const periods: Period[] = [];
  const now = new Date();

  // Add future periods first (furthest future first, so they appear at bottom after reverse)
  for (let i = futureCount; i >= 1; i--) {
    let periodDate: Date;

    switch (cadence) {
      case "daily":
        periodDate = new Date(now);
        periodDate.setDate(periodDate.getDate() + i);
        break;

      case "weekly":
        periodDate = new Date(now);
        periodDate.setDate(periodDate.getDate() + i * 7);
        break;

      case "monthly":
        periodDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        break;
    }

    periods.push(getPeriodForDate(cadence, periodDate));
  }

  // Add current and past periods (current first, then going back)
  for (let i = 0; i <= pastCount; i++) {
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
 * Get default periods for a cadence
 * - Daily: 7 days past + current + 7 days future (15 total)
 * - Weekly: 2 weeks past + current + 2 weeks future (5 total)
 * - Monthly: 2 months past + current + 2 months future (5 total)
 */
export function getDefaultPeriods(cadence: Cadence): Period[] {
  switch (cadence) {
    case "daily":
      return getPeriods(cadence, 7, 7);
    case "weekly":
      return getPeriods(cadence, 2, 2);
    case "monthly":
      return getPeriods(cadence, 2, 2);
  }
}

/**
 * Get periods within a custom date range
 * Returns all periods of the given cadence that fall within startDate to endDate
 */
export function getPeriodsInRange(
  cadence: Cadence,
  startDate: Date,
  endDate: Date,
): Period[] {
  const periods: Period[] = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    const period = getPeriodForDate(cadence, current);

    // Avoid duplicates (important for daily where we iterate day by day)
    const isDuplicate = periods.some(
      (p) => p.start.getTime() === period.start.getTime(),
    );

    if (!isDuplicate) {
      periods.push(period);
    }

    // Move to next period
    switch (cadence) {
      case "daily":
        current = new Date(current);
        current.setDate(current.getDate() + 1);
        break;
      case "weekly":
        current = new Date(current);
        current.setDate(current.getDate() + 7);
        break;
      case "monthly":
        current = new Date(current);
        current.setMonth(current.getMonth() + 1);
        break;
    }
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
