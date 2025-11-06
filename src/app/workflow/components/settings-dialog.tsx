"use client";

import React from "react";

import { Moon, Settings2, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useShallow } from "zustand/react/shallow";

import { useAppStore } from "@/app/workflow/store";
import { type AppStore } from "@/app/workflow/store/app-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

function SettingsItem({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <span className="text-base font-bold">{title}</span>
        <p>{description}.</p>
      </div>
      {children}
    </div>
  );
}

const selector = (state: AppStore) => ({
  isFixedLayout: state.layout === "fixed",
  toggleLayout: state.toggleLayout,
});

export function SettingsDialog() {
  const { isFixedLayout, toggleLayout } = useAppStore(useShallow(selector));
  const { setTheme } = useTheme();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 rounded-md p-2 transition-colors">
          <Settings2 className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-2">Settings</DialogTitle>
        </DialogHeader>

        <SettingsItem
          title="Color mode"
          description="Toggle between dark, light or system color mode."
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingsItem>

        <SettingsItem
          title="Fixed Layout"
          description="Toggle between fixed and free layout"
        >
          <Switch checked={isFixedLayout} onCheckedChange={toggleLayout} />
        </SettingsItem>
      </DialogContent>
    </Dialog>
  );
}
