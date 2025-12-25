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
    <div className="bg-muted/30 flex h-full flex-col gap-1.5 border-r p-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 px-4 py-4",
              "transition-all duration-200 ease-out",
              isActive
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <tab.icon
              className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-200",
                !isActive && "group-hover:translate-y-[-1px]",
              )}
            />
            <span className="text-[11px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
