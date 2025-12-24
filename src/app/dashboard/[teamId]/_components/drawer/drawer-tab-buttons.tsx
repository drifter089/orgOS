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
    <div className="flex h-full flex-col">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1.5",
            "border-b transition-all duration-200 last:border-b-0",
            activeTab === tab.id
              ? "bg-primary/10 text-primary border-l-primary border-l-2"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <tab.icon className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-wide uppercase">
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
