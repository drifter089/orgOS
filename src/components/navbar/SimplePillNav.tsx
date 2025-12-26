"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { motion } from "framer-motion";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { Link } from "next-transition-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeToggle } from "@/hooks/use-theme-toggle";
import { cn } from "@/lib/utils";

// Theme toggle with animated sun/moon
function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggleTheme } = useThemeToggle({
    variant: "circle",
    start: "top-right",
  });

  return (
    <button
      type="button"
      className={cn(
        "rounded-full p-1.5 transition-all duration-200 hover:scale-110 active:scale-95",
        isDark ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900",
        className,
      )}
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        fill="currentColor"
        strokeLinecap="round"
        viewBox="0 0 32 32"
        className="size-4"
      >
        <clipPath id="theme-toggle-clip">
          <motion.path
            animate={{ y: isDark ? 10 : 0, x: isDark ? -12 : 0 }}
            transition={{ ease: "easeInOut", duration: 0.15 }}
            d="M0-5h30a1 1 0 0 0 9 13v24H0Z"
          />
        </clipPath>
        <g clipPath="url(#theme-toggle-clip)">
          <motion.circle
            animate={{ r: isDark ? 10 : 8 }}
            transition={{ ease: "easeInOut", duration: 0.15 }}
            cx="16"
            cy="16"
          />
          <motion.g
            animate={{
              rotate: isDark ? -100 : 0,
              scale: isDark ? 0.5 : 1,
              opacity: isDark ? 0 : 1,
            }}
            transition={{ ease: "easeInOut", duration: 0.15 }}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M16 5.5v-4" />
            <path d="M16 30.5v-4" />
            <path d="M1.5 16h4" />
            <path d="M26.5 16h4" />
            <path d="m23.4 8.6 2.8-2.8" />
            <path d="m5.7 26.3 2.9-2.9" />
            <path d="m5.8 5.8 2.8 2.8" />
            <path d="m23.4 23.4 2.9 2.9" />
          </motion.g>
        </g>
      </svg>
    </button>
  );
}

interface Team {
  id: string;
  name: string;
}

interface SimplePillNavProps {
  user: {
    id: string;
    firstName?: string | null;
  } | null;
  signOutAction: () => Promise<void>;
  teams?: Team[];
}

export function SimplePillNav({
  user,
  signOutAction,
  teams = [],
}: SimplePillNavProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract team ID from pathname
  const currentTeamId =
    pathname.startsWith("/teams/") || pathname.startsWith("/dashboard/")
      ? pathname.split("/")[2]
      : null;

  const isOnTeamPage =
    pathname.startsWith("/teams/") || pathname.startsWith("/dashboard/");
  const currentTeam = teams.find((t) => t.id === currentTeamId);

  // Loading skeleton
  if (!mounted) {
    return (
      <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
        <div className="bg-background/80 border-border h-10 w-40 animate-pulse rounded-full border backdrop-blur-md" />
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
      <div
        className={cn(
          "border-border bg-background/80 flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-lg backdrop-blur-md",
          "transition-all duration-200 hover:shadow-xl",
        )}
      >
        {/* Logo */}
        <Link
          href={user ? "/org" : "/"}
          className="flex items-center gap-2 transition-transform hover:scale-105"
        >
          <div className="bg-primary flex size-7 items-center justify-center rounded-full">
            <span className="text-primary-foreground text-xs font-bold">R</span>
          </div>
          {!user && (
            <span className="text-sm font-semibold whitespace-nowrap">Ryo</span>
          )}
        </Link>

        {user ? (
          <>
            {/* Organization Link */}
            <Link
              href="/org"
              className={cn(
                "text-muted-foreground hover:text-foreground text-sm transition-colors",
                pathname === "/org" && "text-foreground font-medium",
              )}
            >
              Organization
            </Link>

            <div className="bg-border h-5 w-px" />

            {/* Team Dropdown - Always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors",
                  currentTeam && "text-foreground font-medium",
                )}
              >
                {currentTeam?.name ?? "Select Team"}
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8}>
                {teams.length > 0 ? (
                  teams.map((team) => {
                    const targetPath = isOnTeamPage
                      ? pathname.startsWith("/dashboard/")
                        ? `/dashboard/${team.id}`
                        : `/teams/${team.id}`
                      : `/teams/${team.id}`;

                    return (
                      <DropdownMenuItem key={team.id} asChild>
                        <Link
                          href={targetPath}
                          className={cn(
                            team.id === currentTeamId && "bg-accent",
                          )}
                        >
                          {team.name}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <DropdownMenuItem disabled>No teams yet</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Roles/KPIs Tabs - Only on team pages */}
            {isOnTeamPage && currentTeamId && (
              <>
                <div className="bg-border h-5 w-px" />
                <div className="bg-muted flex rounded-md p-0.5">
                  <Link
                    href={`/teams/${currentTeamId}`}
                    className={cn(
                      "text-muted-foreground rounded px-2 py-0.5 text-sm transition-all",
                      pathname.startsWith("/teams/") &&
                        "bg-background text-foreground shadow-sm",
                    )}
                  >
                    Roles
                  </Link>
                  <Link
                    href={`/dashboard/${currentTeamId}`}
                    className={cn(
                      "text-muted-foreground rounded px-2 py-0.5 text-sm transition-all",
                      pathname.startsWith("/dashboard/") &&
                        "bg-background text-foreground shadow-sm",
                    )}
                  >
                    KPIs
                  </Link>
                </div>
              </>
            )}

            <div className="bg-border h-5 w-px" />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 transition-transform hover:scale-110"
                >
                  <Menu className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                <DropdownMenuItem asChild>
                  <form action={signOutAction} className="w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2"
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          /* Unauthenticated - just sign in */
          <Button size="sm" asChild className="h-7 px-3">
            <Link href="/login" prefetch={false}>
              Sign in
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
