"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ManualMetricContent } from "./ManualMetricContent";

interface ManualMetricDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  teamId: string;
}

export function ManualMetricDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  teamId,
}: ManualMetricDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const handleClose = () => {
    setOpen?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Manual KPI</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Track metrics that you update manually on a regular cadence
          </p>
        </DialogHeader>
        <ManualMetricContent
          teamId={teamId}
          onSuccess={onSuccess}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
