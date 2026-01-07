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
      className="bg-muted/30 flex items-center gap-1 border-b px-4 py-2 sm:px-6"
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
              "flex flex-1 items-center justify-center gap-2 border px-3 py-2 text-sm transition-all duration-150 active:scale-[0.98] sm:flex-initial sm:px-4",
              isActive
                ? "bg-background text-foreground border-border font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50 border-transparent",
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
