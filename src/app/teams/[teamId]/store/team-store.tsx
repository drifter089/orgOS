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
import { type StoreApi, create, useStore } from "zustand";

import { type RoleNodeData } from "../_components/role-node";

export type TeamNode = Node<RoleNodeData, "role-node">;
export type TeamEdge = Edge;

type TeamState = {
  // React Flow state
  nodes: TeamNode[];
  edges: TeamEdge[];

  // Team metadata
  teamId: string;
  teamName: string;

  // UI state
  isDirty: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  isInitialized: boolean;
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

  // Dirty state management
  markDirty: () => void;
  markClean: () => void;
  setInitialized: (initialized: boolean) => void;

  // Saving state
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
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
    teamId: initialTeamId,
    teamName: initialTeamName,
    isDirty: false,
    lastSaved: null,
    isSaving: false,
    isInitialized: false,

    // React Flow handlers
    onNodesChange: (changes) => {
      const nextNodes = applyNodeChanges(changes, get().nodes);
      set({ nodes: nextNodes });
      // Only mark dirty if initialized (prevents initial React Flow setup from triggering saves)
      if (get().isInitialized) {
        get().markDirty();
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

    // Dirty state management
    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false }),
    setInitialized: (initialized) => set({ isInitialized: initialized }),

    // Saving state
    setSaving: (saving) => set({ isSaving: saving }),
    setLastSaved: (date) => set({ lastSaved: date }),
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
