"use client";

import { type ReactNode, createContext, useContext, useRef } from "react";

import {
  type Edge,
  type Node,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { type StoreApi, create, useStore } from "zustand";

import type {
  BaseCanvasActions,
  BaseCanvasState,
  BaseCanvasStore,
} from "./types";

/**
 * Options for creating a canvas store factory.
 */
export type CreateCanvasStoreOptions<TEdge extends Edge> = {
  /** Default options to apply when creating new edges */
  defaultEdgeOptions?: Partial<TEdge>;
};

/**
 * Factory function to create a typed canvas store with React Context support.
 *
 * This factory creates:
 * 1. A Zustand store with base canvas state/actions
 * 2. A React Context for the store
 * 3. A Provider component
 * 4. Hooks for accessing the store
 *
 * @template TNode - The node type for this canvas
 * @template TEdge - The edge type for this canvas
 * @template TExtra - Additional state/actions specific to this canvas
 *
 * @example
 * ```tsx
 * const { Provider, useCanvasStore, useCanvasStoreApi } = createCanvasStore<
 *   MyNode,
 *   MyEdge,
 *   { customAction: () => void }
 * >({
 *   defaultEdgeOptions: { animated: true },
 *   createExtraSlice: (set, get) => ({
 *     customAction: () => { ... },
 *   }),
 * });
 * ```
 */
export function createCanvasStore<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
  TExtra extends Record<string, unknown> = Record<string, never>,
>(
  options?: CreateCanvasStoreOptions<TEdge> & {
    /** Factory function to create extra state/actions for this canvas */
    createExtraSlice?: (
      set: (partial: Partial<BaseCanvasStore<TNode, TEdge> & TExtra>) => void,
      get: () => BaseCanvasStore<TNode, TEdge> & TExtra,
    ) => TExtra;
  },
) {
  type CombinedStore = BaseCanvasStore<TNode, TEdge> & TExtra;

  const StoreContext = createContext<StoreApi<CombinedStore> | null>(null);

  /**
   * Creates the actual Zustand store instance.
   */
  function createStoreInstance(): StoreApi<CombinedStore> {
    return create<CombinedStore>()((set, get) => {
      // Create base state
      const baseState: BaseCanvasState<TNode, TEdge> = {
        nodes: [],
        edges: [],
        isDirty: false,
        lastSaved: null,
        isSaving: false,
        isInitialized: false,
      };

      // Create base actions
      const baseActions: BaseCanvasActions<TNode, TEdge> = {
        onNodesChange: (changes) => {
          const nextNodes = applyNodeChanges(changes, get().nodes);
          set({ nodes: nextNodes } as Partial<CombinedStore>);
          if (get().isInitialized) {
            get().markDirty();
          }
        },

        onEdgesChange: (changes) => {
          const nextEdges = applyEdgeChanges(changes, get().edges);
          set({ edges: nextEdges } as Partial<CombinedStore>);
          if (get().isInitialized) {
            get().markDirty();
          }
        },

        onConnect: (connection) => {
          const newEdge = {
            ...connection,
            ...options?.defaultEdgeOptions,
          } as TEdge;
          const nextEdges = addEdge(newEdge, get().edges);
          set({ edges: nextEdges } as Partial<CombinedStore>);
          if (get().isInitialized) {
            get().markDirty();
          }
        },

        setNodes: (nodes) => set({ nodes } as Partial<CombinedStore>),
        setEdges: (edges) => set({ edges } as Partial<CombinedStore>),
        markDirty: () => set({ isDirty: true } as Partial<CombinedStore>),
        markClean: () => set({ isDirty: false } as Partial<CombinedStore>),
        setInitialized: (initialized) =>
          set({ isInitialized: initialized } as Partial<CombinedStore>),
        setSaving: (saving) =>
          set({ isSaving: saving } as Partial<CombinedStore>),
        setLastSaved: (date) =>
          set({ lastSaved: date } as Partial<CombinedStore>),
      };

      // Create extra slice if provided
      const extraSlice =
        options?.createExtraSlice?.(
          set as (partial: Partial<CombinedStore>) => void,
          get,
        ) ?? ({} as TExtra);

      return {
        ...baseState,
        ...baseActions,
        ...extraSlice,
      } as CombinedStore;
    });
  }

  /**
   * Provider component that creates and provides the store to children.
   */
  function Provider({ children }: { children: ReactNode }) {
    const storeRef = useRef<StoreApi<CombinedStore> | null>(null);
    storeRef.current ??= createStoreInstance();

    return (
      <StoreContext.Provider value={storeRef.current}>
        {children}
      </StoreContext.Provider>
    );
  }

  /**
   * Hook to select state from the canvas store.
   * @param selector - Function to select state from the store
   */
  function useCanvasStore<T>(selector: (state: CombinedStore) => T): T {
    const store = useContext(StoreContext);

    if (!store) {
      throw new Error("useCanvasStore must be used within Provider");
    }

    return useStore(store, selector);
  }

  /**
   * Hook to get direct access to the store API for imperative state access.
   * Use this when you need to get current state in callbacks (avoids stale closures).
   */
  function useCanvasStoreApi(): StoreApi<CombinedStore> {
    const store = useContext(StoreContext);

    if (!store) {
      throw new Error("useCanvasStoreApi must be used within Provider");
    }

    return store;
  }

  return {
    Provider,
    useCanvasStore,
    useCanvasStoreApi,
    StoreContext,
  };
}
