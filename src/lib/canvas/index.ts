/**
 * Shared canvas library for React Flow implementations.
 *
 * This module provides reusable patterns for building canvas-based UIs:
 * - Store factory for creating typed Zustand stores with React Context
 * - Auto-save hook factory for debounced persistence
 * - Shared UI components (SaveStatus, EdgeActionButtons)
 * - Type definitions for database serialization
 * - Freehand drawing components
 * - Undo/redo history management
 */

// Types
export * from "./types/serialization";
export * from "./store/types";

// Schemas (Zod validation)
export {
  storedPositionSchema,
  storedEdgeSchema,
  storedNodeBaseSchema,
  viewportSchema,
  type StoredPosition,
  type Viewport,
} from "./schemas/stored-data";

// Store
export * from "./store/create-canvas-store";
export {
  createTextNodeSlice,
  type TextNodeSlice,
  type TextNodeSliceState,
  type TextNodeSliceActions,
} from "./store/text-node-slice";

// Hooks
export * from "./hooks/use-auto-save";
export * from "./hooks/use-force-layout";

// Components
export * from "./components/save-status";
export * from "./components/text-node";
export * from "./components/canvas-controls";

// Edges
export * from "./edges/edge-action-buttons";
export * from "./edges/floating-edge-utils";

// Freehand drawing
export * from "./freehand";

// History (undo/redo)
export * from "./history";
