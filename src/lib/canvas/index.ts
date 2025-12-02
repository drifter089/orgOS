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

// Store
export * from "./store/create-canvas-store";

// Hooks
export * from "./hooks/use-auto-save";

// Components
export * from "./components/save-status";

// Edges
export * from "./edges/edge-action-buttons";

// Freehand drawing
export * from "./freehand";

// History (undo/redo)
export * from "./history";
