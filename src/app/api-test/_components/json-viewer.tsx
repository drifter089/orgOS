"use client";

import React, { useState } from "react";

import { Check, Copy, Maximize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface JsonViewerProps {
  data: unknown;
  maxPreviewHeight?: string;
}

export function JsonViewer({
  data,
  maxPreviewHeight = "120px",
}: JsonViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const syntaxHighlight = (json: string) => {
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "text-amber-600 dark:text-amber-400"; // number
        if (match.startsWith('"')) {
          if (match.endsWith(":")) {
            cls = "text-blue-600 dark:text-blue-400 font-medium"; // key
          } else {
            cls = "text-green-600 dark:text-green-400"; // string
          }
        } else if (/true|false/.test(match)) {
          cls = "text-purple-600 dark:text-purple-400"; // boolean
        } else if (match.includes("null")) {
          cls = "text-gray-500 dark:text-gray-400"; // null
        }
        return `<span class="${cls}">${match}</span>`;
      },
    );
  };

  const PreviewContent = ({
    onClick,
    maxHeight,
  }: {
    onClick?: () => void;
    maxHeight?: string;
  }) => (
    <div
      className="bg-muted/50 group relative cursor-pointer overflow-hidden rounded-lg border"
      onDoubleClick={onClick}
      title="Double-click to view fullscreen"
    >
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 gap-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            void handleCopy();
          }}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span className="text-xs">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 gap-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <Maximize2 className="h-3 w-3" />
          <span className="text-xs">Expand</span>
        </Button>
      </div>

      <ScrollArea className="w-full" style={{ maxHeight: maxHeight }}>
        <pre
          className="overflow-x-auto p-3 pr-24 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap"
          dangerouslySetInnerHTML={{
            __html: syntaxHighlight(jsonString),
          }}
        />
      </ScrollArea>

      <div className="from-muted/80 pointer-events-none absolute right-0 bottom-0 left-0 h-8 bg-gradient-to-t to-transparent" />
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-medium">
            Response Preview
            <span className="text-muted-foreground/60 ml-2 text-[10px]">
              (Double-click to expand)
            </span>
          </p>
          <span className="text-muted-foreground text-[10px]">
            {jsonString.length.toLocaleString()} characters
          </span>
        </div>
        <PreviewContent
          onClick={() => setIsFullscreen(true)}
          maxHeight={maxPreviewHeight}
        />
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="flex max-h-[95vh] max-w-[95vw] flex-col gap-0 p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle>JSON Response</DialogTitle>
                <p className="text-muted-foreground text-sm">
                  {jsonString.length.toLocaleString()} characters
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy All
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFullscreen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-auto p-6">
            <pre
              className="min-w-0 font-mono text-sm leading-relaxed break-all whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: syntaxHighlight(jsonString),
              }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
