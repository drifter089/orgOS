"use client";

import { HelpCircle } from "lucide-react";

import { FormLabel } from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FormLabelWithTooltipProps {
  label: string;
  tooltip: string;
  required?: boolean;
  className?: string;
}

export function FormLabelWithTooltip({
  label,
  tooltip,
  required = false,
  className,
}: FormLabelWithTooltipProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <FormLabel>
        {label}
        {!required && (
          <span className="text-muted-foreground ml-1 text-xs">(Optional)</span>
        )}
      </FormLabel>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[250px]">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
