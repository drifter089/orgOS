"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

import {
  type Node,
  type NodeProps,
  NodeResizer,
  useReactFlow,
} from "@xyflow/react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  FONT_SIZE_VALUES,
  type TextNodeFontSize,
} from "../types/serialization";

export type TextNodeData = {
  text: string;
  fontSize?: TextNodeFontSize;
};

export type TextNodeActions = {
  editingTextNodeId: string | null;
  setEditingTextNodeId: (nodeId: string | null) => void;
  updateTextNodeContent: (nodeId: string, text: string) => void;
  updateTextNodeFontSize: (nodeId: string, fontSize: TextNodeFontSize) => void;
  deleteNode: (nodeId: string) => void;
  markDirty: () => void;
};

export type TextNodeConfig = {
  /** Minimum width for resizer (default: 60) */
  minWidth?: number;
  /** Minimum height for resizer (default: 24) */
  minHeight?: number;
  /** Placeholder text (default: "Type...") */
  placeholder?: string;
  /** Whether to show visible border in non-editing state (default: false) */
  showBorder?: boolean;
};

const FONT_SIZE_OPTIONS: { value: TextNodeFontSize; label: string }[] = [
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
];

type TextNodeComponentProps = {
  data: TextNodeData;
  selected?: boolean;
  id: string;
  actions: TextNodeActions;
  config?: TextNodeConfig;
};

function TextNodeInner({
  data,
  selected = false,
  id,
  actions,
  config,
}: TextNodeComponentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState(data.text);
  const { setNodes } = useReactFlow();

  const {
    editingTextNodeId,
    setEditingTextNodeId,
    updateTextNodeContent,
    updateTextNodeFontSize,
    deleteNode,
    markDirty,
  } = actions;

  const {
    minWidth = 60,
    minHeight = 24,
    placeholder = "Type...",
    showBorder = false,
  } = config ?? {};

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
        minWidth={minWidth}
        minHeight={minHeight}
        lineClassName="!border-primary/40"
        handleClassName="!h-1.5 !w-1.5 !rounded-full !border-primary/60 !bg-background"
      />

      <div
        className={cn(
          "nodrag bg-background absolute -top-8 left-0 z-10 flex items-center gap-1 rounded-md border px-1 py-0.5 shadow-sm transition-opacity",
          isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
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

        <div className="bg-border mx-1 h-4 w-px" />

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

      <div
        className={cn(
          "h-full w-full rounded transition-all duration-150",
          showBorder && "border",
          isEditing
            ? showBorder
              ? "border-primary bg-background/50 shadow-sm"
              : "bg-background/80 ring-primary/50 ring-1 ring-offset-1"
            : selected
              ? showBorder
                ? "border-primary/50 bg-background/50"
                : "bg-background/40 ring-primary/30 ring-1"
              : showBorder
                ? "border-border bg-background/50 hover:border-primary/50"
                : "hover:bg-background/20 bg-transparent",
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
            autoFocus
            className={cn(
              "nodrag nopan",
              "h-full w-full resize-none border-none bg-transparent px-1.5 py-1 outline-none",
              "overflow-hidden break-words",
            )}
            style={{
              fontSize: `${fontSizePx}px`,
            }}
            placeholder={placeholder}
          />
        ) : (
          <div
            className={cn(
              "h-full w-full overflow-hidden px-1.5 py-1 break-words whitespace-pre-wrap select-none",
              showBorder && "cursor-text",
              !data.text && "text-muted-foreground/60 italic",
            )}
            style={{
              fontSize: `${fontSizePx}px`,
            }}
          >
            {data.text || placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Creates a text node component connected to a specific store.
 *
 * @example
 * ```tsx
 * export const TextNodeMemo = createTextNode(() => ({
 *   editingTextNodeId: useTeamStore(s => s.editingTextNodeId),
 *   setEditingTextNodeId: useTeamStore(s => s.setEditingTextNodeId),
 *   updateTextNodeContent: useTeamStore(s => s.updateTextNodeContent),
 *   updateTextNodeFontSize: useTeamStore(s => s.updateTextNodeFontSize),
 *   deleteNode: useTeamStore(s => s.deleteNode),
 *   markDirty: useTeamStore(s => s.markDirty),
 * }));
 * ```
 */
export function createTextNode<TData extends TextNodeData>(
  useActions: () => TextNodeActions,
  config?: TextNodeConfig,
) {
  return memo(function TextNodeComponent({
    data,
    selected,
    id,
  }: NodeProps<Node<TData>>) {
    const actions = useActions();
    return (
      <TextNodeInner
        data={data}
        selected={selected}
        id={id}
        actions={actions}
        config={config}
      />
    );
  });
}

/**
 * Base TextNode component that requires actions passed as a prop.
 * Use createTextNode() for a cleaner API with store-connected components.
 */
export const TextNodeBase = memo(TextNodeInner);
