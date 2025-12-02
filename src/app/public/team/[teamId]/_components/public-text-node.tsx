"use client";

import { memo } from "react";

import { type Node, type NodeProps } from "@xyflow/react";

import { FONT_SIZE_VALUES, type TextNodeFontSize } from "@/lib/canvas";
import { cn } from "@/lib/utils";

export type PublicTextNodeData = {
  text: string;
  fontSize?: TextNodeFontSize;
};

export type PublicTextNode = Node<PublicTextNodeData, "text-node">;

/**
 * Read-only version of TextNode
 * No editing, no resize, no delete
 */
function PublicTextNodeComponent({
  data,
  selected,
}: NodeProps<PublicTextNode>) {
  const fontSize = data.fontSize ?? "medium";
  const fontSizePx = FONT_SIZE_VALUES[fontSize];

  return (
    <div className="h-full w-full">
      {/* Text box with visible border */}
      <div
        className={cn(
          "bg-background/50 h-full w-full rounded border transition-colors",
          selected ? "border-primary/50" : "border-border",
        )}
      >
        <div
          className={cn(
            "h-full w-full overflow-hidden px-2 py-1 break-words whitespace-pre-wrap",
            !data.text && "text-muted-foreground italic",
          )}
          style={{
            fontSize: `${fontSizePx}px`,
          }}
        >
          {data.text || "Empty text"}
        </div>
      </div>
    </div>
  );
}

export const PublicTextNodeMemo = memo(PublicTextNodeComponent);
