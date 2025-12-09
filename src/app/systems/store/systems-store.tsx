"use client";

import { type ReactNode, createContext, useContext, useRef } from "react";

import {
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { type StoreApi, create, useStore } from "zustand";

import { type FreehandNodeType, type TextNodeFontSize } from "@/lib/canvas";

import { type MetricCardNode } from "../_components/metric-card-node";

export type SystemsEdge = Edge;

// Text node data type for systems canvas
export type TextNodeData = {
  text: string;
  fontSize?: TextNodeFontSize;
};

export type TextNode = Node<TextNodeData, "text-node">;
export type SystemsNode = MetricCardNode | FreehandNodeType | TextNode;

type SystemsState = {
  nodes: SystemsNode[];
  edges: SystemsEdge[];
  isDirty: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  isInitialized: boolean;
  isDrawing: boolean;
  isForceLayoutEnabled: boolean;
  editingTextNodeId: string | null;
};

type SystemsActions = {
  onNodesChange: OnNodesChange<SystemsNode>;
  onEdgesChange: OnEdgesChange<SystemsEdge>;
  onConnect: OnConnect;
  setNodes: (nodes: SystemsNode[]) => void;
  setEdges: (edges: SystemsEdge[]) => void;
  markDirty: () => void;
  markClean: () => void;
  setInitialized: (initialized: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setIsForceLayoutEnabled: (enabled: boolean) => void;
  // Text node actions
  setEditingTextNodeId: (nodeId: string | null) => void;
  addTextNode: (position: { x: number; y: number }, text?: string) => string;
  updateTextNodeContent: (nodeId: string, text: string) => void;
  updateTextNodeFontSize: (nodeId: string, fontSize: TextNodeFontSize) => void;
  deleteNode: (nodeId: string) => void;
};

export type SystemsStore = SystemsState & SystemsActions;

export function createSystemsStore() {
  return create<SystemsStore>()((set, get) => ({
    nodes: [],
    edges: [],
    isDirty: false,
    lastSaved: null,
    isSaving: false,
    isInitialized: false,
    isDrawing: false,
    isForceLayoutEnabled: false,
    editingTextNodeId: null,

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
      if (get().isInitialized) {
        get().markDirty();
      }
    },

    onConnect: (connection) => {
      const nextEdges = addEdge(
        {
          ...connection,
          type: "smoothstep",
          animated: true,
        },
        get().edges,
      );
      set({ edges: nextEdges });
      if (get().isInitialized) {
        get().markDirty();
      }
    },

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false }),
    setInitialized: (initialized) => set({ isInitialized: initialized }),
    setSaving: (saving) => set({ isSaving: saving }),
    setLastSaved: (date) => set({ lastSaved: date }),
    setIsDrawing: (isDrawing) => set({ isDrawing }),
    setIsForceLayoutEnabled: (enabled) =>
      set({ isForceLayoutEnabled: enabled }),

    // Text node actions
    setEditingTextNodeId: (nodeId) => set({ editingTextNodeId: nodeId }),

    addTextNode: (position, text = "") => {
      const nodeId = `text-${nanoid(8)}`;
      const newNode: TextNode = {
        id: nodeId,
        type: "text-node",
        position,
        data: { text, fontSize: "medium" },
        style: { width: 180, height: 60 },
      };
      set({ nodes: [...get().nodes, newNode] });
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
  }));
}

const SystemsStoreContext = createContext<StoreApi<SystemsStore> | null>(null);

export function SystemsStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<StoreApi<SystemsStore> | null>(null);
  storeRef.current ??= createSystemsStore();

  return (
    <SystemsStoreContext.Provider value={storeRef.current}>
      {children}
    </SystemsStoreContext.Provider>
  );
}

export function useSystemsStore<T>(selector: (state: SystemsStore) => T): T {
  const store = useContext(SystemsStoreContext);

  if (!store) {
    throw new Error("useSystemsStore must be used within SystemsStoreProvider");
  }

  return useStore(store, selector);
}

export function useSystemsStoreApi() {
  const store = useContext(SystemsStoreContext);

  if (!store) {
    throw new Error(
      "useSystemsStoreApi must be used within SystemsStoreProvider",
    );
  }

  return store;
}
