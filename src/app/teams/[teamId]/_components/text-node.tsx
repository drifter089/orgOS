"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

import { type NodeProps, NodeResizer, useReactFlow } from "@xyflow/react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  type TextNode as TextNodeType,
  useTeamStore,
} from "../store/team-store";
import { FONT_SIZE_VALUES, type TextNodeFontSize } from "../types/canvas";

const FONT_SIZE_OPTIONS: { value: TextNodeFontSize; label: string }[] = [
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
];

function TextNodeComponent({ data, selected, id }: NodeProps<TextNodeType>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState(data.text);
  const { setNodes } = useReactFlow();

  const editingTextNodeId = useTeamStore((state) => state.editingTextNodeId);
  const setEditingTextNodeId = useTeamStore(
    (state) => state.setEditingTextNodeId,
  );
  const updateTextNodeContent = useTeamStore(
    (state) => state.updateTextNodeContent,
  );
  const updateTextNodeFontSize = useTeamStore(
    (state) => state.updateTextNodeFontSize,
  );
  const deleteNode = useTeamStore((state) => state.deleteNode);
  const markDirty = useTeamStore((state) => state.markDirty);

  const isEditing = editingTextNodeId === id;
  const fontSize = data.fontSize ?? "medium";
  const fontSizePx = FONT_SIZE_VALUES[fontSize];

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const newHeight = textarea.scrollHeight + 8;

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          const currentHeight =
            (node.style?.height as number | undefined) ?? 60;
          if (newHeight > currentHeight) {
            markDirty();
            return {
              ...node,
              style: { ...node.style, height: newHeight },
            };
          }
        }
        return node;
      }),
    );

    textarea.style.height = "100%";
  }, [id, setNodes, markDirty]);

  useEffect(() => {
    if (!isEditing) {
      setLocalText(data.text);
    }
  }, [data.text, isEditing]);

  useEffect(() => {
    if (isEditing) {
      // Delay focus to avoid React Flow stealing it
      const timeoutId = setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 50);
      autoResize();
      return () => clearTimeout(timeoutId);
    }
  }, [isEditing, autoResize]);

  const handleDoubleClick = useCallback(() => {
    setEditingTextNodeId(id);
  }, [id, setEditingTextNodeId]);

  const handleSave = useCallback(() => {
    updateTextNodeContent(id, localText);
    setEditingTextNodeId(null);
  }, [id, localText, updateTextNodeContent, setEditingTextNodeId]);

  const handleCancel = useCallback(() => {
    setLocalText(data.text);
    setEditingTextNodeId(null);
  }, [data.text, setEditingTextNodeId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        localText === ""
      ) {
        e.preventDefault();
        deleteNode(id);
      }
    },
    [handleSave, handleCancel, localText, deleteNode, id],
  );

  const handleBlur = useCallback(() => {
    if (localText.trim() === "" && data.text === "") {
      deleteNode(id);
    } else {
      handleSave();
    }
  }, [localText, data.text, deleteNode, id, handleSave]);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [deleteNode, id]);

  const handleFontSizeChange = useCallback(
    (newSize: TextNodeFontSize) => {
      updateTextNodeFontSize(id, newSize);
    },
    [id, updateTextNodeFontSize],
  );

  return (
    <div
      className="group relative h-full w-full"
      onDoubleClick={handleDoubleClick}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={60}
        minHeight={24}
        lineClassName="!border-primary/40"
        handleClassName="!h-1.5 !w-1.5 !rounded-full !border-primary/60 !bg-background"
      />

      <div
        className={cn(
          "nodrag bg-background absolute -top-8 left-0 z-10 flex items-center gap-1 rounded-md border px-1 py-0.5 shadow-sm transition-opacity",
          isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        {/* Font size selector */}
        {FONT_SIZE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={(e) => {
              e.stopPropagation();
              handleFontSizeChange(option.value);
            }}
            onMouseDown={(e) => e.preventDefault()} // Prevent blur on textarea
            className={cn(
              "h-6 w-6 rounded text-xs font-medium transition-colors",
              fontSize === option.value
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
            {option.label}
          </button>
        ))}

        {/* Divider */}
        <div className="bg-border mx-1 h-4 w-px" />

        {/* Delete button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur on textarea
          className="hover:bg-destructive/10 hover:text-destructive h-6 w-6"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div
        className={cn(
          "h-full w-full rounded transition-all duration-150",
          isEditing
            ? "bg-background/80 ring-primary/50 ring-1 ring-offset-1"
            : selected
              ? "bg-background/40 ring-primary/30 ring-1"
              : "hover:bg-background/20 bg-transparent",
        )}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localText}
            onChange={(e) => {
              setLocalText(e.target.value);
              // Auto-resize after state update
              requestAnimationFrame(autoResize);
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            autoFocus
            className={cn(
              "nodrag nopan", // Prevent dragging/panning while editing
              "h-full w-full resize-none border-none bg-transparent px-1.5 py-1 outline-none",
              "overflow-hidden break-words", // Hide scrollbar, node auto-expands
            )}
            style={{
              fontSize: `${fontSizePx}px`,
            }}
            placeholder="Type..."
          />
        ) : (
          <div
            className={cn(
              "h-full w-full overflow-hidden px-1.5 py-1 break-words whitespace-pre-wrap select-none",
              !data.text && "text-muted-foreground/60 italic",
            )}
            style={{
              fontSize: `${fontSizePx}px`,
            }}
          >
            {data.text || "Type..."}
          </div>
        )}
      </div>
    </div>
  );
}

export const TextNodeMemo = memo(TextNodeComponent);
