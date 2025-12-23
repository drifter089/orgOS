import type { Cadence, PeriodBounds } from "./types";

/**
 * Get period start/end dates for given cadence
 */
export function getPeriodBounds(cadence: Cadence): PeriodBounds {
  const now = new Date();

  switch (cadence) {
    case "DAILY":
      return getDailyBounds(now);
    case "WEEKLY":
      return getWeeklyBounds(now);
    case "MONTHLY":
      return getMonthlyBounds(now);
  }
}

function getDailyBounds(now: Date): PeriodBounds {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const periodEnd = new Date(periodStart);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);
  periodEnd.setUTCMilliseconds(-1);

  return buildBounds(periodStart, periodEnd, now, 1);
}

function getWeeklyBounds(now: Date): PeriodBounds {
  // Monday = start of week (ISO standard)
  const dayOfWeek = now.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const periodStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysToMonday,
    ),
  );

  const periodEnd = new Date(periodStart);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 7);
  periodEnd.setUTCMilliseconds(-1);

  return buildBounds(periodStart, periodEnd, now, 7);
}

function getMonthlyBounds(now: Date): PeriodBounds {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  // Last day of month
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  const daysTotal = periodEnd.getUTCDate();
  return buildBounds(periodStart, periodEnd, now, daysTotal);
}

function buildBounds(
  periodStart: Date,
  periodEnd: Date,
  now: Date,
  daysTotal: number,
): PeriodBounds {
  const msPerDay = 24 * 60 * 60 * 1000;
  const msPerHour = 60 * 60 * 1000;

  const msElapsed = now.getTime() - periodStart.getTime();
  const msRemaining = Math.max(0, periodEnd.getTime() - now.getTime());

  return {
    periodStart,
    periodEnd,
    daysElapsed: Math.min(daysTotal, msElapsed / msPerDay),
    daysTotal,
    daysRemaining: msRemaining / msPerDay,
    hoursRemaining: msRemaining / msPerHour,
  };
}
