"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePathname } from "next/navigation";

import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import gsap from "gsap";
import {
  Building2,
  ChevronDown,
  Code2,
  FlaskConical,
  Github,
  Home,
  Layers,
  LayoutDashboard,
  Menu,
  Palette,
  Plug,
  TrendingUp,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { Link } from "next-transition-router";

import {
  Breadcrumb,
  BreadcrumbItem as BreadcrumbItemUI,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContentNoPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeToggle } from "@/hooks/use-theme-toggle";
import type { BreadcrumbItem } from "@/lib/nav-tree";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

// Register GSAP plugins
gsap.registerPlugin();

// Sun/moon theme toggle based on ThemeToggleButton2 from skiper4
function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggleTheme } = useThemeToggle({
    variant: "circle",
    start: "top-right",
  });

  return (
    <button
      type="button"
      className={cn(
        "rounded-full p-2 transition-all duration-300 active:scale-95",
        isDark ? "bg-black text-white" : "bg-white text-black",
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

interface FancyNavProps {
  user: {
    firstName?: string | null;
  } | null;
  signUpUrl: string;
  signOutAction: () => Promise<void>;
  isOrgPage?: boolean;
  breadcrumbs?: BreadcrumbItem[];
}

export function FancyNav({
  user,
  signUpUrl,
  signOutAction,
  isOrgPage = false,
  breadcrumbs = [],
}: FancyNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProdMode, setIsProdMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();

  // Refs for GSAP animations
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const dropdownCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if running in development
  const isDev = process.env.NODE_ENV === "development";

  // Determine if we should show dev-only items
  // In production: always hide dev items
  // In development: show dev items unless "Prod Mode" is toggled on
  const showDevItems = isDev && !isProdMode;

  // Dropdown hover handlers with delay for better UX
  const handleDropdownMouseEnter = useCallback((dropdownId: string) => {
    if (dropdownCloseTimeoutRef.current) {
      clearTimeout(dropdownCloseTimeoutRef.current);
      dropdownCloseTimeoutRef.current = null;
    }
    setOpenDropdown(dropdownId);
  }, []);

  const handleDropdownMouseLeave = useCallback(() => {
    dropdownCloseTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 500);
  }, []);

  // Mount effect
  useEffect(() => {
    setMounted(true);
    return () => {
      if (dropdownCloseTimeoutRef.current) {
        clearTimeout(dropdownCloseTimeoutRef.current);
      }
    };
  }, []);

  // Helper to check if a path is active
  const isActivePath = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  // Fetch all teams for dropdown and expanded nav (only when user is authenticated)
  const { data: teams } = api.team.getAll.useQuery(undefined, {
    enabled: !!user && mounted,
    retry: false,
  });

  // GSAP Animation setup - Simplified timeline
  useGSAP(
    () => {
      if (!containerRef.current || !mounted) return;

      // Kill any existing timeline
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      const pillElement = pillRef.current;
      if (!pillElement) return;

      // Create the main timeline with revertOnUpdate support
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
      });

      // Get the initial collapsed height (dynamic based on pill vs breadcrumb mode)
      const collapsedHeight = pillElement.offsetHeight;

      // Step 1: Hide pill content
      tl.to(
        ".pill-content",
        {
          opacity: 0,
          scale: 0.8,
          duration: 0.09,
          ease: "power2.in",
        },
        0,
      );

      // Remove pill content from flow
      tl.set(
        ".pill-content",
        {
          position: "absolute",
          pointerEvents: "none",
        },
        0.09,
      );

      // Step 2: Expand width
      tl.to(
        pillRef.current,
        {
          width: "min(800px, 90vw)",
          duration: 0.12,
          ease: "power3.out",
        },
        0.03,
      );

      // Step 3: Show expanded content early
      tl.set(
        expandedRef.current,
        {
          display: "grid",
          opacity: 0,
        },
        0.09,
      );

      // Step 4: Expand height
      tl.fromTo(
        pillRef.current,
        {
          height: collapsedHeight,
        },
        {
          height: "auto",
          duration: 0.4,
          ease: "expo.out",
        },
        0.12,
      );

      // Step 5: Fade in expanded content
      tl.to(
        expandedRef.current,
        {
          opacity: 1,
          duration: 0.09,
        },
        0.26,
      );

      tl.from(
        expandedRef.current,
        {
          scale: 0.95,
          y: 10,
          duration: 0.14,
          ease: "back.out(1.5)",
        },
        0.26,
      );

      // Step 6: Stagger menu items
      tl.from(
        ".menu-item",
        {
          opacity: 0,
          x: -15,
          y: 8,
          duration: 0.14,
          stagger: 0.02,
          ease: "back.out(1.5)",
        },
        0.29,
      );

      // Step 7: Show actions
      tl.from(
        actionsRef.current,
        {
          opacity: 0,
          y: 15,
          duration: 0.14,
          ease: "back.out(2)",
        },
        0.4,
      );

      // Store timeline reference
      timelineRef.current = tl;
    },
    {
      scope: containerRef,
      dependencies: [mounted, isProdMode, breadcrumbs.length],
      revertOnUpdate: true,
    },
  );

  // Handle expand/collapse - simply reverse the timeline
  const handleToggle = useCallback(() => {
    if (!timelineRef.current) return;

    if (isExpanded) {
      // Closing - reverse the timeline (plays animation backwards)
      timelineRef.current.reverse();
    } else {
      // Opening - play the timeline forward
      timelineRef.current.play();
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Close nav on route change
  useEffect(() => {
    if (isExpanded && timelineRef.current) {
      timelineRef.current.reverse();
      setIsExpanded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close nav on click outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        if (timelineRef.current) {
          timelineRef.current.reverse();
        }
        setIsExpanded(false);
      }
    };

    // Small delay to avoid the opening click from immediately closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isExpanded]);

  if (!mounted) {
    return (
      <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
        <div className="bg-background/80 border-border h-10 w-32 animate-pulse rounded-md border backdrop-blur-md" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed top-4 left-1/2 z-50 -translate-x-1/2"
    >
      {/* Main pill/expanded container */}
      <div
        ref={pillRef}
        className={cn(
          "border-border relative origin-top rounded-md border shadow-lg transition-all duration-300",
          isExpanded
            ? "bg-background overflow-hidden shadow-2xl"
            : "bg-background/40 overflow-visible shadow-lg backdrop-blur-md hover:shadow-xl",
        )}
      >
        {/* Collapsed pill content */}
        <div className="pill-content flex items-center gap-3 px-4 py-2">
          {isOrgPage ? (
            <>
              {/* Breadcrumb Navigation Mode */}
              <Breadcrumb>
                <BreadcrumbList className="flex-nowrap gap-1.5">
                  {breadcrumbs.map((item, index) => {
                    const isOnDashboard = pathname.startsWith("/dashboard/");
                    const dropdownId = `dropdown-${item.id}`;

                    return (
                      <div key={item.id} className="flex items-center gap-1.5">
                        {/* Tabs for Roles/KPIs switching */}
                        {item.tabs ? (
                          <div className="bg-muted/50 flex items-center rounded-md p-0.5">
                            {item.tabs.items.map((tabItem) => {
                              const isActive = tabItem.path === pathname;
                              return (
                                <Link
                                  key={tabItem.path}
                                  href={tabItem.path}
                                  className={cn(
                                    "relative rounded px-2 py-0.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                      ? "bg-background text-foreground shadow-sm"
                                      : "text-muted-foreground hover:text-foreground",
                                  )}
                                >
                                  {tabItem.label}
                                </Link>
                              );
                            })}
                          </div>
                        ) : item.dropdown ? (
                          <BreadcrumbItemUI
                            className="flex items-center gap-0.5"
                            onMouseEnter={() =>
                              handleDropdownMouseEnter(dropdownId)
                            }
                            onMouseLeave={handleDropdownMouseLeave}
                          >
                            {/* Label - navigable or static */}
                            {item.isNavigable !== false ? (
                              <BreadcrumbLink asChild>
                                <Link href={item.path} className="text-sm">
                                  {item.icon === "home" ? (
                                    <Home className="size-3.5" />
                                  ) : (
                                    item.label
                                  )}
                                </Link>
                              </BreadcrumbLink>
                            ) : (
                              <span className="text-foreground text-sm font-medium">
                                {item.label}
                              </span>
                            )}

                            {/* Dropdown with hover */}
                            <DropdownMenu
                              open={openDropdown === dropdownId}
                              onOpenChange={(open) =>
                                setOpenDropdown(open ? dropdownId : null)
                              }
                            >
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="text-muted-foreground hover:text-foreground hover:bg-accent rounded p-0.5 transition-colors"
                                  aria-label="Switch team"
                                >
                                  <ChevronDown className="size-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContentNoPortal
                                align="start"
                                sideOffset={8}
                                onMouseEnter={() =>
                                  handleDropdownMouseEnter(dropdownId)
                                }
                                onMouseLeave={handleDropdownMouseLeave}
                              >
                                {teams
                                  ? teams.map((team) => {
                                      const teamPath = isOnDashboard
                                        ? `/dashboard/${team.id}`
                                        : `/teams/${team.id}`;
                                      const isCurrentTeam = pathname.includes(
                                        team.id,
                                      );
                                      return (
                                        <Link
                                          key={team.id}
                                          href={teamPath}
                                          className={cn(
                                            "hover:bg-accent hover:text-accent-foreground relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none",
                                            isCurrentTeam && "bg-accent",
                                          )}
                                          onClick={() => setOpenDropdown(null)}
                                        >
                                          {team.name}
                                        </Link>
                                      );
                                    })
                                  : item.dropdown.items.map((dropdownItem) => (
                                      <Link
                                        key={dropdownItem.path}
                                        href={dropdownItem.path}
                                        className={cn(
                                          "hover:bg-accent hover:text-accent-foreground relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none",
                                          dropdownItem.path === pathname &&
                                            "bg-accent",
                                        )}
                                        onClick={() => setOpenDropdown(null)}
                                      >
                                        {dropdownItem.label}
                                      </Link>
                                    ))}
                              </DropdownMenuContentNoPortal>
                            </DropdownMenu>
                          </BreadcrumbItemUI>
                        ) : (
                          <BreadcrumbItemUI>
                            {item.isCurrentPage ? (
                              <BreadcrumbPage className="text-sm">
                                {item.icon === "home" ? (
                                  <Home className="size-3.5" />
                                ) : (
                                  item.label
                                )}
                              </BreadcrumbPage>
                            ) : item.isNavigable !== false ? (
                              <BreadcrumbLink asChild>
                                <Link href={item.path} className="text-sm">
                                  {item.icon === "home" ? (
                                    <Home className="size-3.5" />
                                  ) : (
                                    item.label
                                  )}
                                </Link>
                              </BreadcrumbLink>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {item.icon === "home" ? (
                                  <Home className="size-3.5" />
                                ) : (
                                  item.label
                                )}
                              </span>
                            )}
                          </BreadcrumbItemUI>
                        )}

                        {/* Separator - don't show before tabs */}
                        {index < breadcrumbs.length - 1 &&
                          !breadcrumbs[index + 1]?.tabs && (
                            <BreadcrumbSeparator />
                          )}
                      </div>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>

              {/* Separator */}
              <div className="bg-border h-5 w-px" />

              {/* Quick actions */}
              <div className="flex items-center gap-1.5">
                <ThemeToggle className="size-8 transition-transform hover:scale-110" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 transition-transform hover:scale-110"
                  onClick={handleToggle}
                  aria-label={isExpanded ? "Close menu" : "Open menu"}
                >
                  {isExpanded ? (
                    <X className="size-4" />
                  ) : (
                    <Menu className="size-4" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Logo */}
              <Link
                href="/"
                className="text-primary flex items-center gap-2 font-bold whitespace-nowrap transition-transform hover:scale-105"
                onClick={(e) => {
                  if (isExpanded) {
                    e.preventDefault();
                    handleToggle();
                  }
                }}
              >
                <div className="bg-primary shadow-primary/20 flex size-7 shrink-0 items-center justify-center rounded-full shadow-lg">
                  <span className="text-primary-foreground text-xs font-bold">
                    R
                  </span>
                </div>
                <span className="text-sm whitespace-nowrap">Ryo</span>
              </Link>

              {/* Separator */}
              <div className="bg-border h-5 w-px" />

              {user ? (
                <span className="text-muted-foreground text-sm">
                  Hi, {user.firstName ?? "there"}
                </span>
              ) : (
                <Button size="sm" asChild className="h-7 px-3">
                  <Link href="/login" prefetch={false}>
                    Sign in
                  </Link>
                </Button>
              )}

              <div className="bg-border h-5 w-px" />

              <div className="flex items-center gap-1.5">
                <ThemeToggle className="size-8 transition-transform hover:scale-110" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 transition-transform hover:scale-110"
                  onClick={handleToggle}
                  aria-label={isExpanded ? "Close menu" : "Open menu"}
                >
                  {isExpanded ? (
                    <X className="size-4" />
                  ) : (
                    <Menu className="size-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Expanded content */}
        <div
          ref={expandedRef}
          className="hidden gap-6 p-6"
          style={{ display: "none" }}
        >
          {/* Header with logo and close */}
          <div className="border-border col-span-full flex items-center justify-between border-b pb-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
                <span className="text-primary-foreground font-bold">R</span>
              </div>
              <span className="text-lg font-bold">Ryo</span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Dev mode toggle - only in development */}
              {isDev && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProdMode(!isProdMode)}
                  className={cn(
                    "text-xs",
                    isProdMode
                      ? "border-orange-500 text-orange-500"
                      : "border-green-500 text-green-500",
                  )}
                >
                  {isProdMode ? "Prod Mode" : "Dev Mode"}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggle}
                aria-label="Close menu"
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>

          {/* Menu sections */}
          <div ref={menuItemsRef} className="col-span-full">
            <div
              className={cn(
                "grid gap-6",
                showDevItems ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-3",
              )}
            >
              {/* Column 1: Home */}
              <div className="menu-item">
                <Link
                  href="/"
                  className={cn(
                    "bg-muted/50 hover:bg-muted flex items-center gap-3 rounded-lg p-3 transition-colors",
                    isActivePath("/") && "bg-primary/10 border-primary border",
                  )}
                >
                  <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                    <Home className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium">Home</div>
                    <div className="text-muted-foreground text-xs">
                      Welcome page
                    </div>
                  </div>
                </Link>
              </div>

              {/* Column 2: Docs */}
              <div className="menu-item">
                <Link
                  href="/docs"
                  className={cn(
                    "bg-muted/50 hover:bg-muted flex items-center gap-3 rounded-lg p-3 transition-colors",
                    isActivePath("/docs") &&
                      "bg-primary/10 border-primary border",
                  )}
                >
                  <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                    <Code2 className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium">Docs</div>
                    <div className="text-muted-foreground text-xs">
                      Documentation
                    </div>
                  </div>
                </Link>
              </div>

              {/* Column 3: Organization */}
              <div className="menu-item">
                <Link
                  href="/org"
                  className={cn(
                    "bg-muted/50 hover:bg-muted flex items-center gap-3 rounded-lg p-3 transition-colors",
                    isActivePath("/org") &&
                      "bg-primary/10 border-primary border",
                  )}
                >
                  <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                    <Building2 className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium">Organization</div>
                    <div className="text-muted-foreground text-xs">
                      Manage settings & members
                    </div>
                  </div>
                </Link>
              </div>

              {/* Teams Tree Section */}
              {teams && teams.length > 0 && (
                <div className="menu-item col-span-full">
                  <h3 className="text-muted-foreground mb-2 px-1 text-xs font-semibold tracking-wider uppercase">
                    Teams
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => (
                      <Link
                        key={team.id}
                        href={`/teams/${team.id}`}
                        className={cn(
                          "bg-muted/30 hover:bg-muted/50 flex items-center gap-2 rounded-lg p-3 transition-colors",
                          pathname.includes(team.id) &&
                            "bg-primary/10 border-primary/30 border",
                        )}
                      >
                        <div className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
                          <Users className="size-3.5" />
                        </div>
                        <span className="truncate text-sm font-medium">
                          {team.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Systems Section */}
              <div className="menu-item">
                <Link
                  href="/systems"
                  className={cn(
                    "bg-muted/50 hover:bg-muted flex items-center gap-3 rounded-lg p-3 transition-colors",
                    isActivePath("/systems") &&
                      "bg-primary/10 border-primary border",
                  )}
                >
                  <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                    <Layers className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium">Systems</div>
                    <div className="text-muted-foreground text-xs">
                      Organization-wide metrics
                    </div>
                  </div>
                </Link>
              </div>

              {/* Dev-only: Organization Tree */}
              {showDevItems && (
                <div className="space-y-2">
                  <h3 className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
                    Organization <span className="text-green-500">(Dev)</span>
                  </h3>
                  <div className="space-y-1">
                    {/* Team (Indented) */}
                    <div className="menu-item">
                      <Link
                        href="/teams"
                        className={cn(
                          "hover:bg-muted flex items-center gap-3 rounded-lg border-l-2 border-green-500 p-2 transition-colors",
                          isActivePath("/teams") &&
                            "bg-primary/10 text-primary",
                        )}
                      >
                        <div
                          className={cn(
                            "text-muted-foreground flex size-6 items-center justify-center",
                            isActivePath("/teams") && "text-primary",
                          )}
                        >
                          <Users className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            Teams
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            Browse & manage teams
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Integration (Indented) */}
                    <div className="menu-item">
                      <Link
                        href="/integration"
                        className={cn(
                          "hover:bg-muted flex items-center gap-3 rounded-lg border-l-2 border-green-500 p-2 transition-colors",
                          isActivePath("/integration") &&
                            "bg-primary/10 text-primary",
                        )}
                      >
                        <div
                          className={cn(
                            "text-muted-foreground flex size-6 items-center justify-center",
                            isActivePath("/integration") && "text-primary",
                          )}
                        >
                          <Plug className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            Integrations
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            Connect 3rd party services
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Metric (Indented) */}
                    <div className="menu-item">
                      <Link
                        href="/metric"
                        className={cn(
                          "hover:bg-muted flex items-center gap-3 rounded-lg border-l-2 border-green-500 p-2 transition-colors",
                          isActivePath("/metric") &&
                            "bg-primary/10 text-primary",
                        )}
                      >
                        <div
                          className={cn(
                            "text-muted-foreground flex size-6 items-center justify-center",
                            isActivePath("/metric") && "text-primary",
                          )}
                        >
                          <TrendingUp className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            Metrics
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            Track KPIs
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* KPIs */}
                    <div className="menu-item">
                      <Link
                        href="/dashboard"
                        className={cn(
                          "hover:bg-muted flex items-center gap-3 rounded-lg border-l-2 border-green-500 p-2 transition-colors",
                          isActivePath("/dashboard") &&
                            "bg-primary/10 text-primary",
                        )}
                      >
                        <div
                          className={cn(
                            "text-muted-foreground flex size-6 items-center justify-center",
                            isActivePath("/dashboard") && "text-primary",
                          )}
                        >
                          <LayoutDashboard className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            KPIs
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            Monitor key metrics
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* API Testing */}
                    <div className="menu-item">
                      <Link
                        href="/api-test"
                        className={cn(
                          "hover:bg-muted flex items-center gap-3 rounded-lg border-l-2 border-green-500 p-2 transition-colors",
                          isActivePath("/api-test") &&
                            "bg-primary/10 text-primary",
                        )}
                      >
                        <div
                          className={cn(
                            "text-muted-foreground flex size-6 items-center justify-center",
                            isActivePath("/api-test") && "text-primary",
                          )}
                        >
                          <FlaskConical className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            API Testing
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            Test endpoints
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Dev-only: Features Section */}
              {showDevItems && (
                <div className="space-y-2">
                  <h3 className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
                    Features <span className="text-green-500">(Dev)</span>
                  </h3>
                  <div className="space-y-1">
                    <div className="menu-item">
                      <Link
                        href="/design-strategy"
                        className={cn(
                          "hover:bg-muted flex items-center gap-3 rounded-lg border-l-2 border-green-500 p-2 transition-colors",
                          isActivePath("/design-strategy") &&
                            "bg-primary/10 text-primary",
                        )}
                      >
                        <div
                          className={cn(
                            "text-muted-foreground flex size-6 items-center justify-center",
                            isActivePath("/design-strategy") && "text-primary",
                          )}
                        >
                          <Palette className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            Design Strategy
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            Design patterns & components
                          </div>
                        </div>
                      </Link>
                    </div>

                    <div className="menu-item">
                      <Link
                        href="/render-strategy"
                        className={cn(
                          "hover:bg-muted flex items-center gap-3 rounded-lg border-l-2 border-green-500 p-2 transition-colors",
                          isActivePath("/render-strategy") &&
                            "bg-primary/10 text-primary",
                        )}
                      >
                        <div
                          className={cn(
                            "text-muted-foreground flex size-6 items-center justify-center",
                            isActivePath("/render-strategy") && "text-primary",
                          )}
                        >
                          <Code2 className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            Render Strategy
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            Server/client rendering
                          </div>
                        </div>
                      </Link>
                    </div>

                    <div className="menu-item">
                      <Link
                        href="/workflow"
                        className={cn(
                          "hover:bg-muted flex items-center gap-3 rounded-lg border-l-2 border-green-500 p-2 transition-colors",
                          isActivePath("/workflow") &&
                            "bg-primary/10 text-primary",
                        )}
                      >
                        <div
                          className={cn(
                            "text-muted-foreground flex size-6 items-center justify-center",
                            isActivePath("/workflow") && "text-primary",
                          )}
                        >
                          <Workflow className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            Workflow Builder
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            Visual workflow builder
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions section */}
          <div
            ref={actionsRef}
            className="border-border col-span-full flex items-center justify-between border-t pt-4"
          >
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <ThemeToggle className="size-10" />

              {/* GitHub */}
              <Button variant="ghost" size="icon" asChild>
                <Link
                  href="https://github.com/drifter089/orgOS"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="size-5" />
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {!user ? (
                <>
                  <Button variant="ghost" asChild size="sm">
                    <Link href="/login" prefetch={false}>
                      Sign in
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={signUpUrl} prefetch={false}>
                      Sign up
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground text-sm">
                    {user.firstName ? `Hi, ${user.firstName}` : "Welcome"}
                  </span>
                  <form action={signOutAction}>
                    <Button type="submit" variant="outline" size="sm">
                      Sign out
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
