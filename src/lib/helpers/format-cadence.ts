import type { Cadence } from "@prisma/client";

/**
 * Formats a cadence enum value to a human-readable string
 * @param cadence - The cadence to format (DAILY, WEEKLY, MONTHLY)
 * @returns Lowercase formatted string (e.g., "daily", "weekly", "monthly")
 */
export function formatCadence(cadence: Cadence): string {
  switch (cadence) {
    case "DAILY":
      return "daily";
    case "WEEKLY":
      return "weekly";
    case "MONTHLY":
      return "monthly";
  }
}
