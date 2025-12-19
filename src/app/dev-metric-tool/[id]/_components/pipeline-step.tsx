"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PipelineStepProps {
  stepNumber: number;
  title: string;
  icon: ReactNode;
  description: string;
  badge?: string;
  status?: "success" | "missing" | "error";
  children: ReactNode;
  defaultOpen?: boolean;
}

export function PipelineStep({
  stepNumber,
  title,
  icon,
  description,
  badge,
  status,
  children,
  defaultOpen = true,
}: PipelineStepProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card
      className={cn(
        "transition-all",
        status === "missing" && "border-amber-500/50 bg-amber-500/5",
        status === "error" && "border-red-500/50 bg-red-500/5",
      )}
    >
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium">
              {stepNumber}
            </div>

            <div className="text-primary flex items-center gap-2">{icon}</div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{title}</h3>
                {badge && (
                  <Badge variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                )}
                {status === "missing" && (
                  <Badge
                    variant="outline"
                    className="border-amber-500 text-xs text-amber-600"
                  >
                    Missing
                  </Badge>
                )}
                {status === "error" && (
                  <Badge
                    variant="outline"
                    className="border-red-500 text-xs text-red-600"
                  >
                    Error
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">{description}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0">
          <div className="border-t pt-4">{children}</div>
        </CardContent>
      )}
    </Card>
  );
}
