import type { RouterOutputs } from "@/trpc/react";

export type DashboardChartWithRelations =
  RouterOutputs["dashboard"]["getDashboardCharts"][number];
