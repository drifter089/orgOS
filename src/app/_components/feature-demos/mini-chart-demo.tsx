"use client";

import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

// Area Chart Data
const areaChartData = [
  { month: "January", velocity: 186, quality: 80 },
  { month: "February", velocity: 305, quality: 200 },
  { month: "March", velocity: 237, quality: 120 },
  { month: "April", velocity: 73, quality: 190 },
  { month: "May", velocity: 209, quality: 130 },
  { month: "June", velocity: 214, quality: 140 },
];

const areaChartConfig = {
  velocity: {
    label: "Velocity",
    color: "var(--chart-1)",
  },
  quality: {
    label: "Quality",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

// Bar Chart Data
const barChartData = [
  { month: "January", product: 186, engineering: 80 },
  { month: "February", product: 305, engineering: 200 },
  { month: "March", product: 237, engineering: 120 },
  { month: "April", product: 73, engineering: 190 },
  { month: "May", product: 209, engineering: 130 },
  { month: "June", product: 214, engineering: 140 },
];

const barChartConfig = {
  product: {
    label: "Product",
    color: "var(--chart-1)",
  },
  engineering: {
    label: "Engineering",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

// Radar Chart Data
const radarChartData = [
  { month: "January", performance: 186 },
  { month: "February", performance: 305 },
  { month: "March", performance: 237 },
  { month: "April", performance: 273 },
  { month: "May", performance: 209 },
  { month: "June", performance: 214 },
];

const radarChartConfig = {
  performance: {
    label: "Performance",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

// Radial Chart Data
const radialChartData = [
  { team: "Engineering", members: 275, fill: "var(--color-engineering)" },
  { team: "Product", members: 200, fill: "var(--color-product)" },
  { team: "Design", members: 187, fill: "var(--color-design)" },
  { team: "Marketing", members: 173, fill: "var(--color-marketing)" },
  { team: "Sales", members: 90, fill: "var(--color-sales)" },
];

const radialChartConfig = {
  members: {
    label: "Members",
  },
  engineering: {
    label: "Engineering",
    color: "var(--chart-1)",
  },
  product: {
    label: "Product",
    color: "var(--chart-2)",
  },
  design: {
    label: "Design",
    color: "var(--chart-3)",
  },
  marketing: {
    label: "Marketing",
    color: "var(--chart-4)",
  },
  sales: {
    label: "Sales",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

// Pie Chart Data
const pieChartData = [
  { category: "Engineering", value: 275, fill: "var(--color-engineering)" },
  { category: "Product", value: 200, fill: "var(--color-product)" },
  { category: "Design", value: 187, fill: "var(--color-design)" },
  { category: "Marketing", value: 173, fill: "var(--color-marketing)" },
];

const pieChartConfig = {
  value: {
    label: "Team Members",
  },
  engineering: {
    label: "Engineering",
    color: "var(--chart-1)",
  },
  product: {
    label: "Product",
    color: "var(--chart-2)",
  },
  design: {
    label: "Design",
    color: "var(--chart-3)",
  },
  marketing: {
    label: "Marketing",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function MiniChartDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="grid w-full max-w-6xl grid-cols-3 gap-6">
        {/* Row 1: Bar Chart (2 columns) + Area Chart (1 column) */}

        {/* Bar Chart - 2 columns */}
        <Card className="border-border/50 bg-card/50 col-span-2 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              Team Output Comparison
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Product vs Engineering - January to June 2024
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={barChartConfig}
              className="h-[400px] w-full"
            >
              <BarChart accessibilityLayer data={barChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => String(value).slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <Bar dataKey="product" fill="var(--color-product)" radius={4} />
                <Bar
                  dataKey="engineering"
                  fill="var(--color-engineering)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="text-foreground flex gap-2 leading-none font-medium">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
          </CardFooter>
        </Card>

        {/* Area Chart - 1 column */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-foreground text-base">
              Team Velocity
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Jan - Jun 2024
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={areaChartConfig}
              className="h-[400px] w-full"
            >
              <AreaChart
                accessibilityLayer
                data={areaChartData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => String(value).slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Area
                  dataKey="quality"
                  type="natural"
                  fill="var(--color-quality)"
                  fillOpacity={0.4}
                  stroke="var(--color-quality)"
                  stackId="a"
                />
                <Area
                  dataKey="velocity"
                  type="natural"
                  fill="var(--color-velocity)"
                  fillOpacity={0.4}
                  stroke="var(--color-velocity)"
                  stackId="a"
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
          <CardFooter>
            <div className="flex w-full items-start gap-2 text-sm">
              <div className="grid gap-2">
                <div className="text-foreground flex items-center gap-2 leading-none font-medium">
                  Up 5.2% <TrendingUp className="h-4 w-4" />
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Row 2: Radar Chart + Radial Chart + Pie Chart (each 1 column) */}

        {/* Radar Chart */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-md">
          <CardHeader className="items-center">
            <CardTitle className="text-foreground text-base">
              Performance
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer
              config={radarChartConfig}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <RadarChart data={radarChartData}>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <PolarAngleAxis dataKey="month" />
                <PolarGrid />
                <Radar
                  dataKey="performance"
                  fill="var(--color-performance)"
                  fillOpacity={0.6}
                  dot={{
                    r: 4,
                    fillOpacity: 1,
                  }}
                />
              </RadarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="text-foreground flex items-center gap-2 leading-none font-medium">
              Up 5.2% <TrendingUp className="h-4 w-4" />
            </div>
          </CardFooter>
        </Card>

        {/* Radial Chart */}
        <Card className="border-border/50 bg-card/50 flex flex-col backdrop-blur-md">
          <CardHeader className="items-center pb-0">
            <CardTitle className="text-foreground text-base">
              Team Size
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={radialChartConfig}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <RadialBarChart
                data={radialChartData}
                innerRadius={30}
                outerRadius={110}
              >
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel nameKey="team" />}
                />
                <PolarGrid gridType="circle" />
                <RadialBar dataKey="members" />
              </RadialBarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="text-foreground flex items-center gap-2 leading-none font-medium">
              Up 5.2% <TrendingUp className="h-4 w-4" />
            </div>
          </CardFooter>
        </Card>

        {/* Pie Chart */}
        <Card className="border-border/50 bg-card/50 flex flex-col backdrop-blur-md">
          <CardHeader className="items-center pb-0">
            <CardTitle className="text-foreground text-base">
              Breakdown
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              By Department
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={pieChartConfig}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel nameKey="category" />}
                />
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="category"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="text-foreground flex items-center gap-2 leading-none font-medium">
              Up 5.2% <TrendingUp className="h-4 w-4" />
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
