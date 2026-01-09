"use client";

import { useState } from "react";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Users, X } from "lucide-react";

import { MembersPanel } from "@/components/member/member-list";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

type Member = RouterOutputs["organization"]["getMembers"][number];
type MemberStats = RouterOutputs["organization"]["getMemberStats"];

const SIDEBAR_WIDTH = "26rem";
const SIDEBAR_WIDTH_OFFSET = "26.5rem";

function NonModalSheetContent({
  className,
  children,
  side = "right",
  hideCloseButton = false,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  hideCloseButton?: boolean;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Content
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-[60] flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full border-l",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full border-r",
          className,
        )}
        {...props}
      >
        <SheetPrimitive.Title className="sr-only">
          Members Sidebar
        </SheetPrimitive.Title>
        <SheetPrimitive.Description className="sr-only">
          Quick navigation panel to view and access all organization members
        </SheetPrimitive.Description>
        {children}
        {!hideCloseButton && (
          <SheetPrimitive.Close className="border-border hover:bg-accent focus:ring-ring absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md border transition-all focus:ring-2 focus:outline-hidden disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

interface MembersSidebarProps {
  members: Member[];
  memberStats?: MemberStats;
}

export function MembersSidebar({ members, memberStats }: MembersSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ right: isOpen ? SIDEBAR_WIDTH_OFFSET : undefined }}
        className={cn(
          "fixed top-1/2 z-50 -translate-y-1/2 transition-all duration-300 ease-in-out",
          "flex items-center gap-1 md:gap-1.5",
          "h-7 px-1.5 md:h-8 md:px-2",
          "bg-background rounded-md border",
          "shadow-md hover:shadow-lg",
          "text-xs font-medium",
          isOpen ? "border-primary bg-accent" : "hover:bg-accent/50 right-4",
        )}
        aria-label={isOpen ? "Close Members sidebar" : "Open Members sidebar"}
      >
        <Users className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Members</span>
        <span className="text-muted-foreground">|</span>
        <span>{members.length}</span>
        {isOpen ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <NonModalSheetContent
          side="right"
          style={{ width: SIDEBAR_WIDTH }}
          className="overflow-hidden p-0 sm:max-w-none"
          hideCloseButton
        >
          <MembersPanel members={members} memberStats={memberStats} />
        </NonModalSheetContent>
      </Sheet>
    </>
  );
}
