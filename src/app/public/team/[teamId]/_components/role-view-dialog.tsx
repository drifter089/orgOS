"use client";

import { useState } from "react";

import { Eye, TrendingUp, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import type { PublicRoleNodeData } from "./public-role-node";

interface RoleViewDialogProps {
  data: PublicRoleNodeData;
}

export function RoleViewDialog({ data }: RoleViewDialogProps) {
  const [open, setOpen] = useState(false);
  const color = data.color ?? "#3b82f6";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="hover:bg-primary/10 hover:text-primary h-6 w-6"
        title="View role details"
      >
        <Eye className="h-3 w-3" />
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}20` }}
            >
              <User className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <DialogTitle>{data.title}</DialogTitle>
              <Badge variant="secondary" className="mt-1 text-xs">
                Read-only
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Purpose */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Purpose
            </Label>
            <p className="text-sm leading-relaxed">{data.purpose}</p>
          </div>

          {/* Accountabilities */}
          {data.accountabilities && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Accountabilities
                </Label>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {data.accountabilities}
                </p>
              </div>
            </>
          )}

          {/* Metric */}
          {data.metricName && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Key Metric
                </Label>
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">{data.metricName}</span>
                </div>
              </div>
            </>
          )}

          {/* Assigned User */}
          {data.assignedUserName && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Assigned To
                </Label>
                <div className="flex items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">
                    {data.assignedUserName}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
