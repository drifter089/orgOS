import type { Node } from "@xyflow/react";
import { nanoid } from "nanoid";

import type { TextNodeFontSize } from "../types/serialization";

export type TextNodeData = {
  text: string;
  fontSize?: TextNodeFontSize;
};

export type TextNode = Node<TextNodeData, "text-node">;

export type TextNodeSliceState = {
  editingTextNodeId: string | null;
};

export type TextNodeSliceActions = {
  setEditingTextNodeId: (nodeId: string | null) => void;
  addTextNode: (
    position: { x: number; y: number },
    text?: string,
    autoEdit?: boolean,
  ) => string;
  updateTextNodeContent: (nodeId: string, text: string) => void;
  updateTextNodeFontSize: (nodeId: string, fontSize: TextNodeFontSize) => void;
  deleteNode: (nodeId: string) => void;
};

export type TextNodeSlice = TextNodeSliceState & TextNodeSliceActions;

type SliceContext<TNode extends Node> = {
  getNodes: () => TNode[];
  setNodes: (nodes: TNode[]) => void;
  getEdges: () => { source: string; target: string }[];
  setEdges: (
    edges: { source: string; target: string; [key: string]: unknown }[],
  ) => void;
  isInitialized: () => boolean;
  markDirty: () => void;
};

/**
 * Creates a text node slice that can be composed into any canvas store.
 * Provides text node management actions (add, update, delete).
 */
export function createTextNodeSlice<TNode extends Node>(
  set: (partial: Partial<TextNodeSlice>) => void,
  context: SliceContext<TNode>,
): TextNodeSlice {
  return {
    editingTextNodeId: null,

    setEditingTextNodeId: (nodeId) => set({ editingTextNodeId: nodeId }),

    addTextNode: (position, text = "", autoEdit = false) => {
      const nodeId = `text-${nanoid(8)}`;
      const newNode: TextNode = {
        id: nodeId,
        type: "text-node",
        position,
        data: { text, fontSize: "medium" },
        style: { width: 180, height: 60 },
      };
      context.setNodes([...context.getNodes(), newNode as unknown as TNode]);
      if (autoEdit) {
        set({ editingTextNodeId: nodeId });
      }
      if (context.isInitialized()) {
        context.markDirty();
      }
      return nodeId;
    },

    updateTextNodeContent: (nodeId, text) => {
      context.setNodes(
        context
          .getNodes()
          .map((node) =>
            node.id === nodeId && node.type === "text-node"
              ? { ...node, data: { ...node.data, text } }
              : node,
          ),
      );
      if (context.isInitialized()) {
        context.markDirty();
      }
    },

    updateTextNodeFontSize: (nodeId, fontSize) => {
      context.setNodes(
        context
          .getNodes()
          .map((node) =>
            node.id === nodeId && node.type === "text-node"
              ? { ...node, data: { ...node.data, fontSize } }
              : node,
          ),
      );
      if (context.isInitialized()) {
        context.markDirty();
      }
    },

    deleteNode: (nodeId) => {
      context.setNodes(context.getNodes().filter((n) => n.id !== nodeId));
      context.setEdges(
        context
          .getEdges()
          .filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      if (context.isInitialized()) {
        context.markDirty();
      }
    },
  };
}
