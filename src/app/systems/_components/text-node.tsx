"use client";

import { type TextNodeData, createTextNode } from "@/lib/canvas";

import { useSystemsStore } from "../store/systems-store";

export const SystemsTextNodeMemo = createTextNode<TextNodeData>(
  () => ({
    editingTextNodeId: useSystemsStore((s) => s.editingTextNodeId),
    setEditingTextNodeId: useSystemsStore((s) => s.setEditingTextNodeId),
    updateTextNodeContent: useSystemsStore((s) => s.updateTextNodeContent),
    updateTextNodeFontSize: useSystemsStore((s) => s.updateTextNodeFontSize),
    deleteNode: useSystemsStore((s) => s.deleteNode),
    markDirty: useSystemsStore((s) => s.markDirty),
  }),
  {
    showBorder: true,
    minWidth: 80,
    minHeight: 32,
    placeholder: "Double-click to edit",
  },
);
