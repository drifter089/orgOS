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
    { id: "role", label: "Role", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="bg-muted/30 flex h-full flex-col gap-2 p-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-3",
            "transition-all duration-200",
            activeTab === tab.id
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "bg-background/60 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground border-transparent",
          )}
        >
          <tab.icon className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
