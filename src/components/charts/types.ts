import type { ChartConfig } from "@/components/ui/chart";

export interface ChartComponentProps {
  chartData: Array<Record<string, string | number>>;
  chartConfig: ChartConfig;
  xAxisKey: string;
  dataKeys: string[];
  title?: string;
  description?: string;
}
