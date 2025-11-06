"use client";

import { useCallback, useEffect } from "react";

import {
  type Position,
  type XYPosition,
  useConnection,
  useInternalNode,
  useNodeConnections,
  useNodeId,
} from "@xyflow/react";
import clsx from "clsx";
import { useShallow } from "zustand/react/shallow";

import { FlowDropdownMenu } from "@/app/workflow/components/flow-dropdown-menu";
import {
  type AppNodeType,
  type NodeConfig,
} from "@/app/workflow/components/nodes";
import { useAppStore } from "@/app/workflow/store";
import { type AppStore } from "@/app/workflow/store/app-store";
import { ButtonHandle } from "@/components/button-handle";
import { Button } from "@/components/ui/button";
import { useDropdown } from "@/hooks/use-dropdown";

const compatibleNodeTypes = (type: "source" | "target") => {
  if (type === "source") {
    return (node: NodeConfig) => {
      return (
        node.id === "transform-node" ||
        node.id === "join-node" ||
        node.id === "branch-node" ||
        node.id === "output-node"
      );
    };
  }
  return (node: NodeConfig) => {
    return (
      node.id === "transform-node" ||
      node.id === "join-node" ||
      node.id === "branch-node" ||
      node.id === "initial-node"
    );
  };
};

const selector =
  (nodeId: string, type: string, id?: string | null) => (state: AppStore) => ({
    addNodeInBetween: state.addNodeInBetween,
    draggedNodes: state.draggedNodes,
    connectionSites: state.connectionSites,
    isPotentialConnection:
      state.potentialConnection?.id === `handle-${nodeId}-${type}-${id}`,
  });

// TODO: we need to streamline how we calculate the yOffset
const yOffset = (type: "source" | "target") => (type === "source" ? 100 : -130);

function getIndicatorPostion(
  nodePosition: XYPosition,
  x: number,
  y: number,
  type: "source" | "target",
) {
  return {
    x: nodePosition.x + x,
    y: nodePosition.y + y + yOffset(type),
  };
}

const fallbackPosition = { x: 0, y: 0 };

export function NodeHandle({
  className,
  position: handlePosition,
  type,
  id,
  x,
  y,
}: {
  className?: string;
  id?: string | null;
  type: "source" | "target";
  position: Position;
  x: number;
  y: number;
}) {
  const nodeId = useNodeId() ?? "";

  const connections = useNodeConnections({
    handleType: type,
    handleId: id ?? undefined,
  });

  const isConnectionInProgress = useConnection((c) => c.inProgress);

  const { isOpen, toggleDropdown, ref } = useDropdown();
  const {
    draggedNodes,
    addNodeInBetween,
    connectionSites,
    isPotentialConnection,
  } = useAppStore(useShallow(selector(nodeId, type, id)));

  // We get the actual position of the node
  const nodePosition =
    useInternalNode(nodeId)?.internals.positionAbsolute ?? fallbackPosition;

  const onClick = () => {
    toggleDropdown();
  };

  const onAddNode = useCallback(
    (nodeType: AppNodeType) => {
      if (!nodeId) {
        return;
      }

      addNodeInBetween({
        type: nodeType,
        [type]: nodeId,
        [`${type}HandleId`]: id,
        position: getIndicatorPostion(nodePosition, x, y, type),
      });

      toggleDropdown();
    },
    [nodeId, id, type, nodePosition, x, y, toggleDropdown, addNodeInBetween],
  );

  const displayAddButton =
    connections.length === 0 &&
    !isConnectionInProgress &&
    !draggedNodes.has(nodeId);

  const connectionId = `handle-${nodeId}-${type}-${id}`;
  useEffect(() => {
    if (displayAddButton) {
      connectionSites.set(connectionId, {
        position: getIndicatorPostion(nodePosition, x, y, type),
        [type]: {
          node: nodeId,
          handle: id,
        },
        type,
        id: connectionId,
      });
    }
    return () => {
      connectionSites.delete(connectionId);
    };
  }, [
    nodePosition,
    connectionSites,
    connectionId,
    id,
    nodeId,
    type,
    x,
    y,
    displayAddButton,
  ]);
  return (
    <ButtonHandle
      type={type}
      position={handlePosition}
      id={id}
      className={clsx("top-[-6px] left-[-6px]", className)}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      showButton={displayAddButton}
    >
      <Button
        onClick={onClick}
        size="icon"
        variant="secondary"
        className={clsx("hover:bg-card h-6 w-6 rounded-xl border", {
          "border-red-500": isPotentialConnection,
        })}
      >
        +
      </Button>
      {isOpen && (
        <div
          className="absolute left-1/2 z-50 mt-2 -translate-x-1/2 transform"
          ref={ref}
        >
          <FlowDropdownMenu
            onAddNode={onAddNode}
            filterNodes={compatibleNodeTypes(type)}
          />
        </div>
      )}
    </ButtonHandle>
  );
}
