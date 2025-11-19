import type { ChartConfig } from "@/components/ui/chart";

export interface ChartComponentProps {
  chartData: Array<Record<string, string | number>>;
  chartConfig: ChartConfig;
  xAxisKey: string;
  dataKeys: string[];
  // Rich chart metadata
  title?: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  // Feature flags
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
  // Pie/Radial specific
  centerLabel?: { value: string; label: string };
}
