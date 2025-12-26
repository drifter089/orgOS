import type { ChartConfig } from "@/components/ui/chart";

export interface BaseChartProps {
  chartData: Record<string, unknown>[];
  chartConfig: ChartConfig;
  xAxisKey: string;
  dataKeys: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export interface BarChartProps extends BaseChartProps {
  stacked?: boolean;
  goalValue?: number | null;
  goalLabel?: string;
}

export interface AreaChartProps extends BaseChartProps {
  stacked?: boolean;
  goalValue?: number | null;
  goalLabel?: string;
}

export interface PieChartProps extends BaseChartProps {
  centerLabel?: {
    value: string | number;
    label: string;
  };
}

export type RadarChartProps = BaseChartProps;

export interface RadialChartProps extends BaseChartProps {
  centerLabel?: {
    value: string | number;
    label: string;
  };
}
