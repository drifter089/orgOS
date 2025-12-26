"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { motion } from "framer-motion";
import { Building2, LogOut, Users } from "lucide-react";
import { Link } from "next-transition-router";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useThemeToggle } from "@/hooks/use-theme-toggle";
import { cn } from "@/lib/utils";

function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggleTheme, buttonRef } = useThemeToggle({
    start: "top-right",
  });

  return (
    <button
      ref={buttonRef}
      type="button"
      className={cn(
        "p-1.5 transition-all duration-200 hover:scale-110 active:scale-95",
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
  orgName?: string;
}

export function SimplePillNav({
  user,
  signOutAction,
  teams = [],
  orgName,
}: SimplePillNavProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTeamId =
    pathname.startsWith("/teams/") || pathname.startsWith("/dashboard/")
      ? pathname.split("/")[2]
      : null;

  const isOnTeamPage =
    pathname.startsWith("/teams/") || pathname.startsWith("/dashboard/");
  const isOnDashboard = pathname.startsWith("/dashboard/");
  const currentTeam = teams.find((t) => t.id === currentTeamId);

  if (!mounted) {
    return (
      <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
        <div className="border-border bg-background/60 h-10 w-48 animate-pulse border backdrop-blur-xl" />
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
      <div className="border-border bg-background/60 flex items-center gap-2 border px-3 py-1.5 shadow-lg backdrop-blur-xl">
        {/* Logo */}
        <Link
          href={user ? "/org" : "/"}
          className="flex items-center gap-2 transition-transform hover:scale-105"
        >
          <div className="bg-primary flex size-7 items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">R</span>
          </div>
          {!user && (
            <span className="text-sm font-semibold whitespace-nowrap">Ryo</span>
          )}
        </Link>

        {user ? (
          <>
            <NavigationMenu viewport={false}>
              <NavigationMenuList className="gap-0">
                {/* Organization Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={cn(
                      "h-auto bg-transparent px-2 py-1 text-sm",
                      (pathname === "/org" || pathname === "/member") &&
                        "text-foreground font-medium",
                    )}
                  >
                    {orgName ?? "Organization"}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="w-56 p-2">
                    <NavigationMenuLink asChild>
                      <Link
                        href="/org"
                        className={cn(
                          "hover:bg-muted flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                          pathname === "/org" && "bg-muted font-medium",
                        )}
                      >
                        <Building2 className="text-muted-foreground size-4" />
                        <span>{orgName ?? "Organization"}</span>
                      </Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/member"
                        className={cn(
                          "hover:bg-muted flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                          pathname === "/member" && "bg-muted font-medium",
                        )}
                      >
                        <Users className="text-muted-foreground size-4" />
                        <span>Members</span>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <div className="bg-border mx-1 h-5 w-px" />

                {/* Team Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={cn(
                      "h-auto bg-transparent px-2 py-1 text-sm",
                      currentTeam && "text-foreground font-medium",
                    )}
                  >
                    {currentTeam?.name ?? "Select Team"}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="w-56 p-2">
                    {teams.length > 0 ? (
                      teams.map((team) => {
                        const teamPath = isOnDashboard
                          ? `/dashboard/${team.id}`
                          : `/teams/${team.id}`;
                        const isSelected = team.id === currentTeamId;
                        return (
                          <NavigationMenuLink key={team.id} asChild>
                            <Link
                              href={teamPath}
                              className={cn(
                                "hover:bg-muted flex w-full cursor-pointer items-center px-3 py-2.5 text-sm transition-colors",
                                isSelected && "bg-muted font-medium",
                              )}
                            >
                              <span className="truncate">{team.name}</span>
                            </Link>
                          </NavigationMenuLink>
                        );
                      })
                    ) : (
                      <div className="text-muted-foreground px-3 py-2.5 text-sm">
                        No teams yet
                      </div>
                    )}
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Roles/KPIs Tabs */}
            {isOnTeamPage && currentTeamId && (
              <>
                <div className="bg-border h-5 w-px" />
                <div className="bg-muted flex p-0.5">
                  <Link
                    href={`/teams/${currentTeamId}`}
                    className={cn(
                      "text-muted-foreground px-2 py-0.5 text-sm transition-all",
                      pathname.startsWith("/teams/") &&
                        "bg-background text-foreground shadow-sm",
                    )}
                  >
                    Roles
                  </Link>
                  <Link
                    href={`/dashboard/${currentTeamId}`}
                    className={cn(
                      "text-muted-foreground px-2 py-0.5 text-sm transition-all",
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

            {/* Sign Out Button */}
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="size-7 transition-transform hover:scale-110"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </>
        ) : (
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
