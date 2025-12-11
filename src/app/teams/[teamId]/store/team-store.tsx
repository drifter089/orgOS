"use client";

import { type ReactNode, createContext, useContext, useRef } from "react";

import {
  type Edge,
  MarkerType,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { type StoreApi, create, useStore } from "zustand";

import { type FreehandNodeType } from "@/lib/canvas";

import { type ChartNode } from "../_components/chart-node";
import { type RoleNodeData } from "../_components/role-node";
import { type TextNodeFontSize } from "../types/canvas";

// Text node data type
export type TextNodeData = {
  text: string;
  fontSize?: TextNodeFontSize;
};

export type TextNode = Node<TextNodeData, "text-node">;
export type RoleNode = Node<RoleNodeData, "role-node">;
export type TeamNode = RoleNode | TextNode | ChartNode | FreehandNodeType;
export type TeamEdge = Edge;

type TeamState = {
  // React Flow state
  nodes: TeamNode[];
  edges: TeamEdge[];
  reactFlowInstance: ReactFlowInstance<TeamNode, TeamEdge> | null;

  // Team metadata
  teamId: string;
  teamName: string;

  // UI state
  isDirty: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  isInitialized: boolean;
  editingNodeId: string | null;
  editingTextNodeId: string | null;
  isDrawing: boolean;
  isForceLayoutEnabled: boolean;

  // Viewport state (persisted)
  savedViewport: { x: number; y: number; zoom: number } | null;
};

type TeamActions = {
  // React Flow actions
  onNodesChange: OnNodesChange<TeamNode>;
  onEdgesChange: OnEdgesChange<TeamEdge>;
  onConnect: OnConnect;

  // State setters
  setNodes: (nodes: TeamNode[]) => void;
  setEdges: (edges: TeamEdge[]) => void;
  setTeamName: (name: string) => void;
  setReactFlowInstance: (
    instance: ReactFlowInstance<TeamNode, TeamEdge> | null,
  ) => void;

  // Dirty state management
  markDirty: () => void;
  markClean: () => void;
  setInitialized: (initialized: boolean) => void;

  // Saving state
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;

  // Edit dialog (for role nodes)
  setEditingNodeId: (nodeId: string | null) => void;

  // Text node actions
  setEditingTextNodeId: (nodeId: string | null) => void;
  addTextNode: (
    position: { x: number; y: number },
    text?: string,
    autoEdit?: boolean,
  ) => string;
  updateTextNodeContent: (nodeId: string, text: string) => void;
  updateTextNodeFontSize: (nodeId: string, fontSize: TextNodeFontSize) => void;
  deleteNode: (nodeId: string) => void;

  // Drawing mode
  setIsDrawing: (isDrawing: boolean) => void;

  // Force layout
  setIsForceLayoutEnabled: (enabled: boolean) => void;

  // Viewport
  setSavedViewport: (
    viewport: { x: number; y: number; zoom: number } | null,
  ) => void;
};

export type TeamStore = TeamState & TeamActions;

export function createTeamStore(
  initialTeamId: string,
  initialTeamName: string,
) {
  return create<TeamStore>()((set, get) => ({
    // Initial state
    nodes: [],
    edges: [],
    reactFlowInstance: null,
    teamId: initialTeamId,
    teamName: initialTeamName,
    isDirty: false,
    lastSaved: null,
    isSaving: false,
    isInitialized: false,
    editingNodeId: null,
    editingTextNodeId: null,
    isDrawing: false,
    isForceLayoutEnabled: false,
    savedViewport: null,

    onNodesChange: (changes) => {
      const currentNodes = get().nodes;
      const nextNodes = applyNodeChanges(changes, currentNodes);
      set({ nodes: nextNodes });

      if (get().isInitialized) {
        // Skip marking dirty for freehand-only changes (drawings are session-only)
        const onlyFreehandChanges = changes.every((change) => {
          if ("id" in change) {
            const node =
              currentNodes.find((n) => n.id === change.id) ??
              nextNodes.find((n) => n.id === change.id);
            return node?.type === "freehand";
          }
          return false;
        });

        if (!onlyFreehandChanges) {
          get().markDirty();
        }
      }
    },

    onEdgesChange: (changes) => {
      const nextEdges = applyEdgeChanges(changes, get().edges);
      set({ edges: nextEdges });
      // Only mark dirty if initialized
      if (get().isInitialized) {
        get().markDirty();
      }
    },

    onConnect: (connection) => {
      const nextEdges = addEdge(
        {
          ...connection,
          type: "team-edge",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        },
        get().edges,
      );
      set({ edges: nextEdges });
      // Only mark dirty if initialized
      if (get().isInitialized) {
        get().markDirty();
      }
    },

    // State setters
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setTeamName: (name) => {
      set({ teamName: name });
      get().markDirty();
    },
    setReactFlowInstance: (instance) => set({ reactFlowInstance: instance }),

    // Dirty state management
    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false }),
    setInitialized: (initialized) => set({ isInitialized: initialized }),

    // Saving state
    setSaving: (saving) => set({ isSaving: saving }),
    setLastSaved: (date) => set({ lastSaved: date }),

    // Edit dialog (for role nodes)
    setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),

    // Text node actions
    setEditingTextNodeId: (nodeId) => set({ editingTextNodeId: nodeId }),

    addTextNode: (position, text = "", autoEdit = false) => {
      const nodeId = `text-${nanoid(8)}`;
      const newNode: TextNode = {
        id: nodeId,
        type: "text-node",
        position,
        data: { text, fontSize: "medium" },
        style: { width: 180, height: 60 }, // Initial size for resizable node
      };
      set({
        nodes: [...get().nodes, newNode],
        ...(autoEdit && { editingTextNodeId: nodeId }),
      });
      if (get().isInitialized) {
        get().markDirty();
      }
      return nodeId;
    },

    updateTextNodeContent: (nodeId, text) => {
      set({
        nodes: get().nodes.map((node) =>
          node.id === nodeId && node.type === "text-node"
            ? { ...node, data: { ...node.data, text } }
            : node,
        ),
      });
      if (get().isInitialized) {
        get().markDirty();
      }
    },

    updateTextNodeFontSize: (nodeId, fontSize) => {
      set({
        nodes: get().nodes.map((node) =>
          node.id === nodeId && node.type === "text-node"
            ? { ...node, data: { ...node.data, fontSize } }
            : node,
        ),
      });
      if (get().isInitialized) {
        get().markDirty();
      }
    },

    deleteNode: (nodeId) => {
      set({
        nodes: get().nodes.filter((n) => n.id !== nodeId),
        edges: get().edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        ),
      });
      if (get().isInitialized) {
        get().markDirty();
      }
    },

    // Drawing mode
    setIsDrawing: (isDrawing) => set({ isDrawing }),
    setIsForceLayoutEnabled: (enabled) =>
      set({ isForceLayoutEnabled: enabled }),

    // Viewport
    setSavedViewport: (viewport) => set({ savedViewport: viewport }),
  }));
}

// Context for the store
const TeamStoreContext = createContext<StoreApi<TeamStore> | null>(null);

export function TeamStoreProvider({
  children,
  teamId,
  teamName,
}: {
  children: ReactNode;
  teamId: string;
  teamName: string;
}) {
  const storeRef = useRef<StoreApi<TeamStore> | null>(null);

  storeRef.current ??= createTeamStore(teamId, teamName);

  return (
    <TeamStoreContext.Provider value={storeRef.current}>
      {children}
    </TeamStoreContext.Provider>
  );
}

export function useTeamStore<T>(selector: (state: TeamStore) => T): T {
  const store = useContext(TeamStoreContext);

  if (!store) {
    throw new Error("useTeamStore must be used within TeamStoreProvider");
  }

  return useStore(store, selector);
}

/**
 * Hook to get direct access to the store API for imperative state access
 * Use this when you need to get current state in callbacks (avoids stale closures)
 */
export function useTeamStoreApi() {
  const store = useContext(TeamStoreContext);

  if (!store) {
    throw new Error("useTeamStoreApi must be used within TeamStoreProvider");
  }

  return store;
}
