"use client";

import React, { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = api.feedback.submit.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Feedback submitted successfully! ${data.issueId ? `Issue: ${data.issueId}` : ""}`,
      );
      setFeedback("");
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to submit feedback: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback.mutateAsync({ message: feedback });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <GooeySvg />
      <motion.div
        style={{ filter: "url(#goo)" }}
        className="fixed right-6 bottom-6 z-50"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{
                y: 0,
                x: 0,
                width: 56,
                height: 56,
              }}
              animate={{
                y: -60,
                x: -264,
                width: 320,
                height: "auto",
                transition: {
                  ...LOGO_SPRING,
                  delay: 0.15,
                  y: {
                    ...LOGO_SPRING,
                    delay: 0,
                  },
                  x: {
                    ...LOGO_SPRING,
                    delay: 0.15,
                  },
                },
              }}
              exit={{
                y: 0,
                x: 0,
                width: 56,
                height: 56,
                transition: {
                  ...LOGO_SPRING,
                  x: {
                    ...LOGO_SPRING,
                    delay: 0,
                  },
                  y: {
                    ...LOGO_SPRING,
                    delay: 0.15,
                  },
                },
              }}
              onMouseEnter={() => setIsOpen(true)}
              onMouseLeave={() => {
                if (!isSubmitting) {
                  setIsOpen(false);
                }
              }}
              className="bg-popover text-popover-foreground border-border absolute bottom-0 overflow-hidden border shadow-lg"
            >
              <motion.div
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(4px)" }}
                className="w-[320px] space-y-3 p-4"
              >
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Send us feedback
                    </span>
                    <MessageSquare className="h-4 w-4 opacity-50" />
                  </div>

                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us what you think..."
                    className="min-h-[100px] resize-none"
                    disabled={isSubmitting}
                  />

                  <Button
                    type="submit"
                    size="sm"
                    className="w-full"
                    disabled={isSubmitting || !feedback.trim()}
                  >
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Feedback
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => {
            if (!isSubmitting) {
              setIsOpen(false);
            }
          }}
          className={cn(
            "bg-primary text-primary-foreground flex h-14 w-14 cursor-pointer items-center justify-center shadow-lg transition-transform hover:scale-105",
            "relative after:absolute after:bottom-0 after:h-[150%] after:w-full after:p-5 after:content-['']",
          )}
        >
          <MessageSquare className="h-6 w-6" />
        </div>
      </motion.div>
    </>
  );
}

const GooeySvg = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute h-0 w-0"
      version="1.1"
    >
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.4" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -7"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
  );
};

const LOGO_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;
