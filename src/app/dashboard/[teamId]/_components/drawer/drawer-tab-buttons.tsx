"use client";

import { Briefcase, Settings, Target } from "lucide-react";

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
    { id: "role", label: "Roles", icon: Briefcase },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="bg-muted/20 flex flex-row gap-1.5 border-b p-1.5 md:h-full md:flex-col md:gap-2 md:border-r md:border-b-0 md:p-2.5">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "group relative flex flex-1 flex-col items-center gap-1 rounded-md border",
              "px-2 py-1.5 md:flex-initial md:gap-1.5 md:px-4 md:py-3",
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
                "h-4 w-4 shrink-0 transition-transform duration-150 md:h-5 md:w-5",
                !isActive && "group-hover:scale-110",
              )}
            />
            <span className="text-[10px] font-medium md:text-[11px]">
              {tab.label}
            </span>
            {/* Active indicator line - only visible on desktop */}
            {isActive && (
              <div className="bg-primary-foreground/30 absolute top-1/2 -right-[11px] hidden h-6 w-0.5 -translate-y-1/2 rounded-full md:block" />
            )}
          </button>
        );
      })}
    </div>
  );
}
