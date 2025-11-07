"use client";

import { type ComponentProps } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

import { CreateRoleDialog } from "./role-dialog";

interface TeamSidebarProps extends ComponentProps<typeof Sidebar> {
  teamId: string;
  teamName: string;
  teamDescription?: string | null;
  roleCount: number;
}

export function TeamSidebar({
  teamId,
  teamName,
  teamDescription,
  roleCount,
  ...props
}: TeamSidebarProps) {
  return (
    <Sidebar
      side="right"
      collapsible="offcanvas"
      className="bg-sidebar border-l"
      {...props}
    >
      <SidebarHeader className="border-b">
        <div className="px-4 py-4">
          <h2 className="text-xl font-semibold tracking-tight">{teamName}</h2>
          {teamDescription && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {teamDescription}
            </p>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground px-4 text-xs font-medium tracking-wider uppercase">
            Team Info
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 px-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Roles</span>
                <span className="text-sm font-medium">{roleCount}</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="bg-border mx-4 my-2 h-px" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground px-4 text-xs font-medium tracking-wider uppercase">
            Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-4 py-2">
              <CreateRoleDialog teamId={teamId} />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
