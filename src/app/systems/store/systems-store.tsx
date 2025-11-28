"use client";

import { type ReactNode, createContext, useContext, useRef } from "react";

import {
  type Edge,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { type StoreApi, create, useStore } from "zustand";

import { type MetricCardNode } from "../_components/metric-card-node";

export type SystemsEdge = Edge;

type SystemsState = {
  nodes: MetricCardNode[];
  edges: SystemsEdge[];
  isDirty: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  isInitialized: boolean;
};

type SystemsActions = {
  onNodesChange: OnNodesChange<MetricCardNode>;
  onEdgesChange: OnEdgesChange<SystemsEdge>;
  onConnect: OnConnect;
  setNodes: (nodes: MetricCardNode[]) => void;
  setEdges: (edges: SystemsEdge[]) => void;
  markDirty: () => void;
  markClean: () => void;
  setInitialized: (initialized: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
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

    onNodesChange: (changes) => {
      const nextNodes = applyNodeChanges(changes, get().nodes);
      set({ nodes: nextNodes });
      if (get().isInitialized) {
        get().markDirty();
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
