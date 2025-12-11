"use client";

import { type TextNodeData, createTextNode } from "@/lib/canvas";

import { useTeamStore } from "../store/team-store";

export const TextNodeMemo = createTextNode<TextNodeData>(() => ({
  editingTextNodeId: useTeamStore((s) => s.editingTextNodeId),
  setEditingTextNodeId: useTeamStore((s) => s.setEditingTextNodeId),
  updateTextNodeContent: useTeamStore((s) => s.updateTextNodeContent),
  updateTextNodeFontSize: useTeamStore((s) => s.updateTextNodeFontSize),
  deleteNode: useTeamStore((s) => s.deleteNode),
  markDirty: useTeamStore((s) => s.markDirty),
}));
