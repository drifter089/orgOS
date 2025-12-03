"use client";

import { useCallback, useEffect, useState } from "react";

import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

interface MetricCard {
  id: string;
  label: string;
  role: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  color: string;
  baseValue: number;
}

const metrics: MetricCard[] = [
  {
    id: "nps",
    label: "NPS score",
    role: "chief customer learner",
    value: 72,
    unit: "",
    trend: "up",
    color: "rgb(180, 154, 142)", // warm clay
    baseValue: 72,
  },
  {
    id: "velocity",
    label: "sprint velocity",
    role: "lead engineer",
    value: 34,
    unit: "pts",
    trend: "stable",
    color: "rgb(142, 157, 172)", // soft indigo
    baseValue: 34,
  },
  {
    id: "shipped",
    label: "features shipped",
    role: "product lead",
    value: 12,
    unit: "/mo",
    trend: "up",
    color: "rgb(139, 152, 140)", // matcha
    baseValue: 12,
  },
];

function generateChartData(
  baseValue: number,
  trend: "up" | "down" | "stable",
): { value: number }[] {
  const points: { value: number }[] = [];
  let current = baseValue * 0.85;
  for (let i = 0; i < 20; i++) {
    const trendFactor = trend === "up" ? 0.015 : trend === "down" ? -0.015 : 0;
    const randomFactor = (Math.random() - 0.5) * baseValue * 0.08;
    current = current + baseValue * trendFactor + randomFactor;
    current = Math.max(current, baseValue * 0.6);
    current = Math.min(current, baseValue * 1.4);
    points.push({ value: Math.round(current * 10) / 10 });
  }
  if (trend === "up") {
    points[18] = { value: baseValue * 1.05 };
    points[19] = { value: baseValue * 1.1 };
  }
  if (trend === "down") {
    points[18] = { value: baseValue * 0.95 };
    points[19] = { value: baseValue * 0.9 };
  }
  return points;
}

export function MetricsCanvas() {
  const [chartData, setChartData] = useState<
    Record<string, { value: number }[]>
  >({});
  const [currentValues, setCurrentValues] = useState<Record<string, number>>(
    {},
  );
  const [pulsingCard, setPulsingCard] = useState<string | null>(null);

  useEffect(() => {
    const initialData: Record<string, { value: number }[]> = {};
    const initialValues: Record<string, number> = {};

    metrics.forEach((metric) => {
      initialData[metric.id] = generateChartData(
        metric.baseValue,
        metric.trend,
      );
      initialValues[metric.id] = metric.baseValue;
    });
    setChartData(initialData);
    setCurrentValues(initialValues);
  }, []);

  const updateMetric = useCallback((metricId: string) => {
    const metric = metrics.find((m) => m.id === metricId);
    if (!metric) return;

    setPulsingCard(metricId);

    const newData = generateChartData(metric.baseValue, metric.trend);
    setChartData((prev) => ({ ...prev, [metricId]: newData }));

    const variation = (Math.random() - 0.3) * metric.baseValue * 0.1;
    const newValue = Math.round(metric.baseValue + variation);
    setCurrentValues((prev) => ({ ...prev, [metricId]: newValue }));

    setTimeout(() => setPulsingCard(null), 1500);
  }, []);

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    metrics.forEach((metric, index) => {
      const interval = setInterval(
        () => updateMetric(metric.id),
        3500 + index * 1500,
      );
      intervals.push(interval);
    });
    return () => intervals.forEach(clearInterval);
  }, [updateMetric]);

  return (
    <div className="border-border relative aspect-[4/3] w-full overflow-hidden rounded-sm border bg-[#faf9f7] p-4 sm:p-6">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgb(60, 60, 55) 1px, transparent 1px),
            linear-gradient(90deg, rgb(60, 60, 55) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Header */}
      <div className="relative mb-4 sm:mb-6">
        <span
          className="text-foreground/40 font-mono text-[8px] uppercase sm:text-[9px]"
          style={{ letterSpacing: "0.1em" }}
        >
          live metrics
        </span>
        <motion.div
          className="absolute top-0 right-0 h-2 w-2 rounded-full bg-[rgb(139,152,140)]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Metric cards */}
      <div className="relative flex flex-col gap-3 sm:gap-4">
        {metrics.map((metric) => {
          const isPulsing = pulsingCard === metric.id;
          const data = chartData[metric.id] ?? [];
          const value = currentValues[metric.id] ?? metric.baseValue;

          return (
            <motion.div
              key={metric.id}
              className="border-border/50 rounded-sm border bg-[#fdfcfb] p-3 sm:p-4"
              animate={{
                borderColor: isPulsing ? metric.color : "rgba(0,0,0,0.06)",
                boxShadow: isPulsing ? `0 0 20px ${metric.color}15` : "none",
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p
                    className="text-foreground/40 mb-1 font-mono text-[8px] uppercase sm:text-[9px]"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {metric.role}
                  </p>
                  <p
                    className="text-foreground/70 text-xs sm:text-sm"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {metric.label}
                  </p>
                </div>
                <motion.div
                  className="text-right"
                  animate={{ scale: isPulsing ? [1, 1.05, 1] : 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <span
                    className="font-sans text-lg sm:text-xl"
                    style={{
                      letterSpacing: "-0.03em",
                      color: metric.color,
                    }}
                  >
                    {value}
                  </span>
                  <span
                    className="text-foreground/40 ml-0.5 text-[10px] sm:text-xs"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {metric.unit}
                  </span>
                </motion.div>
              </div>

              {/* Recharts Area Chart */}
              {data.length > 0 && (
                <motion.div
                  className="h-10 w-full"
                  animate={{ opacity: isPulsing ? [0.7, 1, 0.7] : 1 }}
                  transition={{ duration: 1.5 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data}
                      margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
                    >
                      <defs>
                        <linearGradient
                          id={`gradient-${metric.id}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={metric.color}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor={metric.color}
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      </defs>
                      <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={metric.color}
                        strokeWidth={1.5}
                        fill={`url(#gradient-${metric.id})`}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Corner marks */}
      <div className="border-foreground/8 absolute top-3 left-3 h-3 w-3 border-t border-l" />
      <div className="border-foreground/8 absolute top-3 right-3 h-3 w-3 border-t border-r" />
      <div className="border-foreground/8 absolute bottom-3 left-3 h-3 w-3 border-b border-l" />
      <div className="border-foreground/8 absolute right-3 bottom-3 h-3 w-3 border-r border-b" />
    </div>
  );
}
