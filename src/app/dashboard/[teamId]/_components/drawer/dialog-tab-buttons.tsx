"use client";

import { Briefcase, Settings, Target } from "lucide-react";

import { cn } from "@/lib/utils";

export type DialogTab = "goal" | "role" | "settings";

interface DialogTabButtonsProps {
  activeTab: DialogTab;
  onTabChange: (tab: DialogTab) => void;
}

export function DialogTabButtons({
  activeTab,
  onTabChange,
}: DialogTabButtonsProps) {
  const tabs: { id: DialogTab; label: string; icon: typeof Target }[] = [
    { id: "goal", label: "Goal", icon: Target },
    { id: "role", label: "Roles", icon: Briefcase },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div
      className="flex items-center border-b px-4 sm:px-6"
      role="tablist"
      aria-label="Metric settings tabs"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm transition-all duration-150 sm:flex-initial sm:px-4",
              isActive
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent",
            )}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
