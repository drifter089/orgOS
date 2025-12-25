"use client";

import { Settings, Target, Users } from "lucide-react";

import { cn } from "@/lib/utils";

export type DrawerTab = "goal" | "role" | "settings";

interface DrawerTabButtonsProps {
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
}

export function DrawerTabButtons({
  activeTab,
  onTabChange,
}: DrawerTabButtonsProps) {
  const tabs: { id: DrawerTab; label: string; icon: typeof Target }[] = [
    { id: "goal", label: "Goal", icon: Target },
    { id: "role", label: "Roles", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="bg-muted/20 flex h-full flex-col gap-2 border-r p-2.5">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 rounded-md border px-4 py-3",
              "transition-all duration-150 ease-out",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-border bg-background text-muted-foreground",
              !isActive && [
                "hover:border-primary/50 hover:bg-muted/80 hover:text-foreground",
                "hover:scale-[1.02] hover:shadow-sm",
                "active:scale-[0.98]",
              ],
            )}
          >
            <tab.icon
              className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-150",
                !isActive && "group-hover:scale-110",
              )}
            />
            <span className="text-[11px] font-medium">{tab.label}</span>
            {/* Active indicator line */}
            {isActive && (
              <div className="bg-primary-foreground/30 absolute top-1/2 -right-[11px] h-6 w-0.5 -translate-y-1/2 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
