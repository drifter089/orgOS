"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, Users } from "lucide-react";

export function CollaborationDemo() {
  const teamMembers = [
    { name: "Alex Chen", role: "Product Lead", avatar: "AC", status: "active" },
    {
      name: "Sarah Kim",
      role: "Engineering",
      avatar: "SK",
      status: "active",
    },
    {
      name: "Mike Ross",
      role: "Designer",
      avatar: "MR",
      status: "reviewing",
    },
    {
      name: "Emma Wilson",
      role: "Product Manager",
      avatar: "EW",
      status: "active",
    },
  ];

  const activities = [
    {
      user: "Alex Chen",
      action: "updated role definition",
      time: "2m ago",
      icon: CheckCircle2,
    },
    {
      user: "Sarah Kim",
      action: "assigned new metric",
      time: "5m ago",
      icon: Users,
    },
    {
      user: "Mike Ross",
      action: "reviewing responsibilities",
      time: "12m ago",
      icon: Clock,
    },
  ];

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-6">
        {/* Team Members */}
        <div className="border-border/50 bg-card/50 rounded-xl p-6 backdrop-blur-md">
          <h3 className="text-foreground mb-4 flex items-center gap-2 text-lg font-semibold">
            <Users className="size-5" />
            Active Team Members
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="border-border/50 bg-muted/20 flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-full text-sm font-bold">
                  {member.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-foreground font-medium">{member.name}</p>
                  <p className="text-muted-foreground text-xs">{member.role}</p>
                </div>
                <div
                  className={`size-2 rounded-full ${
                    member.status === "active"
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="border-border/50 bg-card/50 rounded-xl p-6 backdrop-blur-md">
          <h3 className="text-foreground mb-4 text-lg font-semibold">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="border-border/50 bg-muted/20 flex items-start gap-3 rounded-lg border p-3"
                >
                  <Icon className="text-primary mt-0.5 size-5" />
                  <div className="flex-1">
                    <p className="text-foreground text-sm">
                      <span className="font-semibold">{activity.user}</span>{" "}
                      {activity.action}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {activity.time}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
