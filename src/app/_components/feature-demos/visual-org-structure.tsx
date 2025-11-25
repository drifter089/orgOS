"use client";

import { motion } from "framer-motion";

export function VisualOrgStructure() {
  const orgLevels = [
    { name: "Leadership", count: 3, color: "from-purple-500 to-pink-500" },
    { name: "Management", count: 8, color: "from-blue-500 to-cyan-500" },
    { name: "Teams", count: 24, color: "from-green-500 to-emerald-500" },
    {
      name: "Individual Contributors",
      count: 67,
      color: "from-orange-500 to-yellow-500",
    },
  ];

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Org Structure Visualization */}
        <div className="space-y-4">
          {orgLevels.map((level, index) => (
            <motion.div
              key={level.name}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-foreground text-sm font-semibold">
                  {level.name}
                </h3>
                <span className="text-primary text-xs font-medium">
                  {level.count} roles
                </span>
              </div>
              <div className="border-border/50 bg-card/30 relative h-16 overflow-hidden rounded-xl border backdrop-blur-md">
                <motion.div
                  className={`bg-gradient-to-r ${level.color} absolute inset-0 opacity-20`}
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  transition={{
                    delay: 0.5 + index * 0.15,
                    duration: 0.8,
                  }}
                />
                <div className="relative flex h-full items-center justify-center gap-2 px-4">
                  {Array.from({ length: Math.min(level.count, 12) }).map(
                    (_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.8 + index * 0.15 + i * 0.02,
                          duration: 0.2,
                        }}
                        className={`bg-gradient-to-br ${level.color} size-8 rounded-lg shadow-lg`}
                      />
                    ),
                  )}
                  {level.count > 12 && (
                    <span className="text-foreground text-xs font-medium">
                      +{level.count - 12}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="border-border/50 bg-card/50 rounded-xl p-4 text-center backdrop-blur-md"
          >
            <p className="text-foreground text-3xl font-bold">102</p>
            <p className="text-muted-foreground mt-1 text-xs">Total Roles</p>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="border-border/50 bg-card/50 rounded-xl p-4 text-center backdrop-blur-md"
          >
            <p className="text-foreground text-3xl font-bold">18</p>
            <p className="text-muted-foreground mt-1 text-xs">Departments</p>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="border-border/50 bg-card/50 rounded-xl p-4 text-center backdrop-blur-md"
          >
            <p className="text-foreground text-3xl font-bold">247</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Metrics Tracked
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
