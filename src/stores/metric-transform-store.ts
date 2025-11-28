import { create } from "zustand";

import type { ChartTransformResult } from "@/server/api/services/chart-tools/types";

export type TransformStatus =
  | "idle"
  | "fetching"
  | "transforming"
  | "ready"
  | "error";

export interface TransformEntry {
  key: string;
  status: TransformStatus;
  rawData: unknown;
  chartData: ChartTransformResult | null;
  error: string | null;
}

interface MetricTransformState {
  transforms: Map<string, TransformEntry>;

  // Actions
  startFetch: (key: string) => void;
  setRawData: (key: string, data: unknown) => void;
  startTransform: (key: string) => void;
  setChartData: (key: string, data: ChartTransformResult) => void;
  setError: (key: string, error: string) => void;
  reset: (key: string) => void;
  resetAll: () => void;
  getTransform: (key: string) => TransformEntry | undefined;
}

const createEmptyEntry = (key: string): TransformEntry => ({
  key,
  status: "idle",
  rawData: null,
  chartData: null,
  error: null,
});

export const useMetricTransformStore = create<MetricTransformState>(
  (set, get) => ({
    transforms: new Map(),

    startFetch: (key) => {
      set((state) => ({
        transforms: new Map(state.transforms).set(key, {
          ...createEmptyEntry(key),
          status: "fetching",
        }),
      }));
    },

    setRawData: (key, data) => {
      set((state) => {
        const entry = state.transforms.get(key);
        if (!entry) {
          // Create new entry if doesn't exist
          return {
            transforms: new Map(state.transforms).set(key, {
              ...createEmptyEntry(key),
              rawData: data,
              status: "ready",
            }),
          };
        }
        return {
          transforms: new Map(state.transforms).set(key, {
            ...entry,
            rawData: data,
            status: "ready",
          }),
        };
      });
    },

    startTransform: (key) => {
      set((state) => {
        const entry = state.transforms.get(key);
        if (!entry) return state;
        return {
          transforms: new Map(state.transforms).set(key, {
            ...entry,
            status: "transforming",
          }),
        };
      });
    },

    setChartData: (key, data) => {
      set((state) => {
        const entry = state.transforms.get(key);
        if (!entry) return state;
        return {
          transforms: new Map(state.transforms).set(key, {
            ...entry,
            chartData: data,
            status: "ready",
          }),
        };
      });
    },

    setError: (key, error) => {
      set((state) => {
        const entry = state.transforms.get(key);
        if (!entry) return state;
        return {
          transforms: new Map(state.transforms).set(key, {
            ...entry,
            error,
            status: "error",
          }),
        };
      });
    },

    reset: (key) => {
      set((state) => {
        const newMap = new Map(state.transforms);
        newMap.delete(key);
        return { transforms: newMap };
      });
    },

    resetAll: () => {
      set({ transforms: new Map() });
    },

    getTransform: (key) => get().transforms.get(key),
  }),
);

/**
 * Create a stable transform key from params
 */
export function createTransformKey(params: {
  connectionId: string;
  templateId: string;
  endpointParams: Record<string, string>;
}): string {
  return JSON.stringify({
    c: params.connectionId,
    t: params.templateId,
    p: params.endpointParams,
  });
}
