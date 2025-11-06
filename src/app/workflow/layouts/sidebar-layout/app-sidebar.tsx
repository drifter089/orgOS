"use client";

import { type ComponentProps, useCallback, useRef, useState } from "react";

import { useReactFlow } from "@xyflow/react";
import { Command, GripVertical, Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import {
  type AppNode,
  type NodeConfig,
  createNodeByType,
} from "@/app/workflow/components/nodes";
import { SettingsDialog } from "@/app/workflow/components/settings-dialog";
import { useAppStore } from "@/app/workflow/store";
import { type AppStore } from "@/app/workflow/store/app-store";
import { iconMapping } from "@/app/workflow/utils/icon-mapping";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { nodesConfig } from "../../config";

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader className="py-0">
        <div className="flex h-14 items-center gap-2 px-1">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-5 items-center justify-center rounded-md">
            <Command className="size-3" />
          </div>
          <span className="truncate font-semibold">Workflow Editor</span>
        </div>
        <SidebarMenu>
          {Object.values(nodesConfig).map((item) => (
            <DraggableItem key={item.title} {...item} />
          ))}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <SettingsDialog />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

const selector = (state: AppStore) => ({
  addNode: state.addNode,
  checkForPotentialConnection: state.checkForPotentialConnection,
  resetPotentialConnection: state.resetPotentialConnection,
});

function DraggableItem(props: NodeConfig) {
  const { screenToFlowPosition } = useReactFlow();
  const { addNode, checkForPotentialConnection, resetPotentialConnection } =
    useAppStore(useShallow(selector));
  const [isDragging, setIsDragging] = useState(false);

  const onClick = useCallback(() => {
    const newNode: AppNode = createNodeByType({
      type: props.id,
      position: screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }),
    });

    addNode(newNode);
  }, [props, addNode, screenToFlowPosition]);

  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("application/reactflow", JSON.stringify(props));
      setIsDragging(true);
    },
    [props],
  );

  const lastDragPos = useRef({ x: 0, y: 0 });
  const onDrag = useCallback(
    (e: React.DragEvent) => {
      const lastPos = lastDragPos.current;
      // we need to keep track of the last drag position to avoid unnecessary calculations
      // the drag api constantly fires events even if the mouse is not moving
      if (lastPos.x === e.clientX && lastPos.y === e.clientY) {
        return;
      }
      lastDragPos.current = { x: e.clientX, y: e.clientY };

      const flowPosition = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const handles = nodesConfig[props.id].handles.map(
        (handle) => handle.type,
      );
      const handleType = handles.reduce(
        (acc, type) => {
          if (acc === "none") return type;
          if (acc !== "both" && acc !== type) return "both";
          return acc;
        },
        "none" as "both" | "none" | "source" | "target",
      );

      if (handleType === "none") return;

      checkForPotentialConnection(flowPosition, {
        type: handleType === "both" ? undefined : handleType,
      });
    },
    [screenToFlowPosition, checkForPotentialConnection, props.id],
  );

  const onDragEnd = useCallback(() => {
    setIsDragging(false);
    resetPotentialConnection();
  }, [resetPotentialConnection]);

  const IconComponent = props?.icon ? iconMapping[props.icon] : undefined;

  return (
    <SidebarMenuItem
      className={cn(
        "relative rounded-md border-2 active:scale-[.99]",
        isDragging ? "border-green-500" : "border-gray-100",
      )}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onClick={onClick}
      draggable
      key={props.title}
    >
      {isDragging && (
        <span
          role="presentation"
          className="bg-card absolute -top-3 -right-3 rounded-md border-2 border-green-500"
        >
          <Plus className="size-4" />
        </span>
      )}
      <SidebarMenuButton className="bg-card cursor-grab active:cursor-grabbing">
        {IconComponent ? <IconComponent aria-label={props?.icon} /> : null}
        <span>{props.title}</span>
        <GripVertical className="ml-auto" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
