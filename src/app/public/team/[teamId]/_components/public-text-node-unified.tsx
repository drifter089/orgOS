"use client";

import { memo } from "react";

import { type Node, type NodeProps } from "@xyflow/react";

import { FONT_SIZE_VALUES } from "@/lib/canvas/types/serialization";
import type { TextNodeFontSize } from "@/lib/canvas/types/serialization";
import { cn } from "@/lib/utils";

export type PublicTextNodeData = {
  text: string;
  fontSize?: TextNodeFontSize;
};

export type PublicTextNode = Node<PublicTextNodeData, "text-node">;

function PublicTextNodeComponent({
  data,
  selected,
}: NodeProps<PublicTextNode>) {
  const fontSize = data.fontSize ?? "medium";
  const fontSizePx = FONT_SIZE_VALUES[fontSize];

  return (
    <div className="group relative h-full w-full">
      <div
        className={cn(
          "h-full w-full rounded transition-all duration-150",
          "bg-transparent",
          selected && "bg-background/40 ring-primary/30 ring-1",
        )}
      >
        <div
          className={cn(
            "h-full w-full overflow-hidden px-1.5 py-1 break-words whitespace-pre-wrap select-none",
            !data.text && "text-muted-foreground/60 italic",
          )}
          style={{
            fontSize: `${fontSizePx}px`,
          }}
        >
          {data.text || "Text"}
        </div>
      </div>
    </div>
  );
}

export const PublicTextNodeMemo = memo(PublicTextNodeComponent);
