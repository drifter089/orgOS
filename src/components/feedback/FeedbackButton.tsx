"use client";

import React, { useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/trpc/react";

import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

const PRIORITY_OPTIONS = [
  { value: "0", label: "No Priority", icon: "—" },
  { value: "1", label: "Urgent", icon: "🔴" },
  { value: "2", label: "High", icon: "🟠" },
  { value: "3", label: "Medium", icon: "🟡" },
  { value: "4", label: "Low", icon: "🟢" },
] as const;

export function FeedbackButton() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [priority, setPriority] = useState<string>("0");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [hasShownStayOpenToast, setHasShownStayOpenToast] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const CLOSE_DELAY_MS = 300;

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const submitFeedback = api.feedback.submit.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Feedback saved! ${data.issueId ? `Issue: ${data.issueId}` : ""}`,
      );
    },
    onError: (error) => {
      toast.error(`Failed to save feedback: ${error.message}`);
    },
  });

  const cancelCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const openPopup = () => {
    cancelCloseTimeout();
    setIsOpen(true);
  };

  const closePopup = () => setIsOpen(false);

  const scheduleClose = () => {
    cancelCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      closePopup();
      setHasShownStayOpenToast(false);
    }, CLOSE_DELAY_MS);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    toast.info("Feedback sent!");
    submitFeedback.mutate({
      message: feedback,
      priority: parseInt(priority, 10),
      pageUrl: pathname,
    });

    setFeedback("");
    setPriority("0");
    closePopup();
  };

  const handleMouseLeave = () => {
    if (!feedback.trim() && !isSelectOpen) {
      scheduleClose();
    } else if (feedback.trim() && !hasShownStayOpenToast) {
      toast("📝 Your feedback is safe!", {
        description: "Send it or clear the text to close.",
        duration: 3000,
      });
      setHasShownStayOpenToast(true);
    }
  };

  const handleButtonHover = (entering: boolean) => {
    if (!buttonRef.current) return;
    gsap.to(buttonRef.current, {
      scale: entering ? 1.05 : 1,
      duration: 0.2,
      ease: "power2.out",
    });
  };

  useGSAP(
    () => {
      if (!popupRef.current) return;

      if (isOpen) {
        gsap.set(popupRef.current, {
          display: "block",
          clipPath: "inset(100% 0% 0% 0%)",
        });
        gsap.to(popupRef.current, {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.4,
          ease: "power3.out",
        });
      } else {
        gsap.to(popupRef.current, {
          clipPath: "inset(100% 0% 0% 0%)",
          duration: 0.3,
          ease: "power3.in",
          onComplete: () => {
            if (popupRef.current) {
              gsap.set(popupRef.current, { display: "none" });
            }
          },
        });
      }
    },
    { dependencies: [isOpen], scope: containerRef },
  );

  if (pathname === "/" || pathname === "/mission") {
    return null;
  }

  return (
    <div ref={containerRef} className="fixed right-6 bottom-6 z-50">
      <div
        ref={popupRef}
        onMouseEnter={openPopup}
        onMouseLeave={handleMouseLeave}
        className="bg-popover text-popover-foreground border-border absolute right-0 bottom-16 hidden w-[320px] border shadow-lg"
        style={{ borderRadius: "var(--radius)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Send us feedback</span>
            <MessageSquare className="h-4 w-4 opacity-50" />
          </div>

          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us what you think..."
            className="min-h-[100px] resize-none"
          />

          <Select
            value={priority}
            onValueChange={setPriority}
            onOpenChange={setIsSelectOpen}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Priority (optional)" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={!feedback.trim()}
          >
            <Send className="mr-2 h-4 w-4" />
            Send Feedback
          </Button>
        </form>
      </div>

      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={() => {
          openPopup();
          handleButtonHover(true);
        }}
        onMouseLeave={() => {
          handleMouseLeave();
          handleButtonHover(false);
        }}
        className="bg-primary text-primary-foreground flex h-14 w-14 cursor-pointer items-center justify-center shadow-lg"
        style={{ borderRadius: "var(--radius)" }}
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    </div>
  );
}
