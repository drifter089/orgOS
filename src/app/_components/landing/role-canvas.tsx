"use client";

import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

interface Role {
  id: string;
  label: string;
  purpose: string;
  x: number;
  y: number;
  color: string;
}

const roles: Role[] = [
  {
    id: "product",
    label: "product lead",
    purpose: "ship what matters",
    x: 20,
    y: 35,
    color: "rgb(139, 152, 140)",
  },
  {
    id: "customer",
    label: "chief customer learner",
    purpose: "understand deeply",
    x: 75,
    y: 28,
    color: "rgb(180, 154, 142)",
  },
  {
    id: "engineer",
    label: "lead engineer",
    purpose: "build with precision",
    x: 50,
    y: 72,
    color: "rgb(142, 157, 172)",
  },
];

export function RoleCanvas() {
  const [visibleRoles, setVisibleRoles] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState({ x: 50, y: 50 });
  const [showCursor, setShowCursor] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [showPurpose, setShowPurpose] = useState<string[]>([]);

  useEffect(() => {
    const sequence = async () => {
      setVisibleRoles([]);
      setShowCursor(true);
      setShowPurpose([]);
      setCursorPosition({ x: roles[0].x, y: roles[0].y });
      await delay(800);
      setIsClicking(true);
      await delay(150);
      setIsClicking(false);
      setVisibleRoles(["product"]);
      await delay(300);
      setShowPurpose(["product"]);
      await delay(700);
      setCursorPosition({ x: roles[1].x, y: roles[1].y });
      await delay(700);
      setIsClicking(true);
      await delay(150);
      setIsClicking(false);
      setVisibleRoles(["product", "customer"]);
      await delay(300);
      setShowPurpose(["product", "customer"]);
      await delay(700);
      setCursorPosition({ x: roles[2].x, y: roles[2].y });
      await delay(700);
      setIsClicking(true);
      await delay(150);
      setIsClicking(false);
      setVisibleRoles(["product", "customer", "engineer"]);
      await delay(300);
      setShowPurpose(["product", "customer", "engineer"]);
      await delay(500);
      setShowCursor(false);
      await delay(4000);
      void sequence();
    };
    void sequence();
  }, []);

  return (
    <div className="border-border relative aspect-[4/3] w-full overflow-hidden rounded-sm border bg-[#faf9f7]">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgb(60, 60, 55) 1px, transparent 1px),
            linear-gradient(90deg, rgb(60, 60, 55) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Role nodes */}
      <AnimatePresence>
        {roles
          .filter((role) => visibleRoles.includes(role.id))
          .map((role) => (
            <motion.div
              key={role.id}
              className="absolute flex flex-col items-center"
              style={{
                left: `${role.x}%`,
                top: `${role.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <motion.div
                className="relative h-4 w-4 rounded-full"
                style={{
                  backgroundColor: role.color,
                  boxShadow: `0 0 12px ${role.color}40`,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.25, delay: 0.1 }}
              />
              <motion.span
                className="text-foreground/80 mt-2 font-mono text-[9px] whitespace-nowrap sm:text-[10px]"
                style={{ letterSpacing: "0.02em" }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                {role.label}
              </motion.span>
              <AnimatePresence>
                {showPurpose.includes(role.id) && (
                  <motion.span
                    className="mt-1 text-[8px] whitespace-nowrap italic sm:text-[9px]"
                    style={{
                      letterSpacing: "0.01em",
                      color: role.color,
                    }}
                    initial={{ opacity: 0, y: -3 }}
                    animate={{ opacity: 0.9, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    {role.purpose}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
      </AnimatePresence>

      {/* Animated cursor */}
      <AnimatePresence>
        {showCursor && (
          <motion.div
            className="pointer-events-none absolute z-10"
            style={{
              left: `${cursorPosition.x}%`,
              top: `${cursorPosition.y}%`,
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              left: `${cursorPosition.x}%`,
              top: `${cursorPosition.y}%`,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-sm"
              animate={{ scale: isClicking ? 0.85 : 1 }}
              transition={{ duration: 0.1 }}
            >
              <path
                d="M5.5 3.21V20.79c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z"
                fill="rgb(60, 60, 55)"
                fillOpacity="0.85"
              />
              <path
                d="M5.5 3.21V20.79c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z"
                stroke="#faf9f7"
                strokeWidth="1.5"
              />
            </motion.svg>
            <AnimatePresence>
              {isClicking && (
                <motion.div
                  className="absolute top-0 left-0 h-5 w-5 rounded-full"
                  style={{ border: "1px solid rgb(139, 152, 140)" }}
                  initial={{ scale: 0.5, opacity: 0.7 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corner marks */}
      <div className="border-foreground/8 absolute top-3 left-3 h-3 w-3 border-t border-l" />
      <div className="border-foreground/8 absolute top-3 right-3 h-3 w-3 border-t border-r" />
      <div className="border-foreground/8 absolute bottom-3 left-3 h-3 w-3 border-b border-l" />
      <div className="border-foreground/8 absolute right-3 bottom-3 h-3 w-3 border-r border-b" />
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
