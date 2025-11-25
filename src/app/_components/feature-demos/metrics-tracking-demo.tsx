"use client";

import { motion } from "framer-motion";
import { Activity, Target, TrendingUp } from "lucide-react";

export function MetricsTrackingDemo() {
  const metrics = [
    {
      name: "Sprint Velocity",
      current: 42,
      target: 50,
      unit: "points",
      icon: Activity,
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Customer NPS",
      current: 87,
      target: 90,
      unit: "%",
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
    },
    {
      name: "Time to Resolution",
      current: 2.3,
      target: 2.0,
      unit: "hours",
      icon: Target,
      color: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const progress = (metric.current / metric.target) * 100;

          return (
            <motion.div
              key={metric.name}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="border-border/50 bg-card/50 overflow-hidden rounded-xl backdrop-blur-md"
            >
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`bg-gradient-to-br ${metric.color} flex size-10 items-center justify-center rounded-lg`}
                    >
                      <Icon className="size-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold">
                        {metric.name}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        Target: {metric.target} {metric.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground text-2xl font-bold">
                      {metric.current}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {metric.unit}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-muted/30 relative h-3 overflow-hidden rounded-full">
                  <motion.div
                    className={`bg-gradient-to-r ${metric.color} h-full rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ delay: 0.5 + index * 0.15, duration: 1 }}
                  />
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="border-border/50 bg-muted/20 rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">Progress</p>
                    <p className="text-primary mt-1 text-lg font-bold">
                      {Math.round(progress)}%
                    </p>
                  </div>
                  <div className="border-border/50 bg-muted/20 rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">This Week</p>
                    <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
                      +{Math.round(metric.current * 0.1)}
                    </p>
                  </div>
                  <div className="border-border/50 bg-muted/20 rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">Trend</p>
                    <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
                      ↑
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
