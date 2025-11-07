"use client";

import { type ComponentProps } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
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
    <Sidebar side="right" className="border-l-0" {...props}>
      <SidebarHeader>
        <div className="px-2 py-4">
          <h2 className="text-2xl font-bold tracking-tight">{teamName}</h2>
          {teamDescription && (
            <p className="text-muted-foreground mt-1 text-sm">
              {teamDescription}
            </p>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Team Info</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-2">
              <p className="text-muted-foreground text-sm">
                {roleCount} role{roleCount !== 1 ? "s" : ""}
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-2">
              <CreateRoleDialog teamId={teamId} />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
