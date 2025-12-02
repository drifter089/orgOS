"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

import { type NodeProps, NodeResizer, useReactFlow } from "@xyflow/react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FONT_SIZE_VALUES, type TextNodeFontSize } from "@/lib/canvas";
import { cn } from "@/lib/utils";

import {
  type TextNode as TextNodeType,
  useSystemsStore,
} from "../store/systems-store";

const FONT_SIZE_OPTIONS: { value: TextNodeFontSize; label: string }[] = [
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
];

function TextNodeComponent({ data, selected, id }: NodeProps<TextNodeType>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState(data.text);
  const { setNodes } = useReactFlow();

  const editingTextNodeId = useSystemsStore((state) => state.editingTextNodeId);
  const setEditingTextNodeId = useSystemsStore(
    (state) => state.setEditingTextNodeId,
  );
  const updateTextNodeContent = useSystemsStore(
    (state) => state.updateTextNodeContent,
  );
  const updateTextNodeFontSize = useSystemsStore(
    (state) => state.updateTextNodeFontSize,
  );
  const deleteNode = useSystemsStore((state) => state.deleteNode);
  const markDirty = useSystemsStore((state) => state.markDirty);

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
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      autoResize();
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
        minWidth={80}
        minHeight={32}
        lineClassName="!border-primary"
        handleClassName="!h-2 !w-2 !rounded-sm !border-primary !bg-background"
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
            onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
          className="hover:bg-destructive/10 hover:text-destructive h-6 w-6"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Text box with visible border */}
      <div
        className={cn(
          "bg-background/50 h-full w-full rounded border transition-colors",
          isEditing
            ? "border-primary shadow-sm"
            : selected
              ? "border-primary/50"
              : "border-border hover:border-primary/50",
        )}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localText}
            onChange={(e) => {
              setLocalText(e.target.value);
              requestAnimationFrame(autoResize);
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(
              "nodrag nopan",
              "h-full w-full resize-none border-none bg-transparent px-2 py-1 outline-none",
              "overflow-hidden break-words",
            )}
            style={{
              fontSize: `${fontSizePx}px`,
            }}
            placeholder="Type here..."
          />
        ) : (
          <div
            className={cn(
              "h-full w-full cursor-text overflow-hidden px-2 py-1 break-words whitespace-pre-wrap select-none",
              !data.text && "text-muted-foreground italic",
            )}
            style={{
              fontSize: `${fontSizePx}px`,
            }}
          >
            {data.text || "Double-click to edit"}
          </div>
        )}
      </div>
    </div>
  );
}

export const SystemsTextNodeMemo = memo(TextNodeComponent);
