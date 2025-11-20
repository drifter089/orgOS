"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Building2,
  Code2,
  FlaskConical,
  Github,
  LayoutDashboard,
  Menu,
  Palette,
  Plug,
  TrendingUp,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ThemeToggleButton,
  useThemeToggle,
} from "@/components/ui/skiper-ui/skiper26";
import { cn } from "@/lib/utils";

// Register GSAP plugins
gsap.registerPlugin();

interface FancyNavProps {
  user: {
    firstName?: string | null;
  } | null;
  signUpUrl: string;
  signOutAction: () => Promise<void>;
}

// Menu item types
interface MenuItem {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  devOnly?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
  devOnly?: boolean;
}

// Define menu structure
const menuSections: MenuSection[] = [
  {
    title: "Organization",
    items: [
      {
        href: "/org",
        title: "Organization",
        description: "Manage settings & members",
        icon: <Building2 className="size-4" />,
      },
      {
        href: "/teams",
        title: "Teams",
        description: "Browse & manage teams",
        icon: <Users className="size-4" />,
      },
      {
        href: "/dashboard",
        title: "Dashboard",
        description: "Monitor key metrics",
        icon: <LayoutDashboard className="size-4" />,
      },
      {
        href: "/integration",
        title: "Integrations",
        description: "Connect 3rd party services",
        icon: <Plug className="size-4" />,
      },
      {
        href: "/metric",
        title: "Metrics",
        description: "Track KPIs",
        icon: <TrendingUp className="size-4" />,
      },
      {
        href: "/api-test",
        title: "API Testing",
        description: "Test endpoints",
        icon: <FlaskConical className="size-4" />,
        devOnly: true,
      },
    ],
  },
  {
    title: "Features",
    devOnly: true,
    items: [
      {
        href: "/design-strategy",
        title: "Design Strategy",
        description: "Design patterns & components",
        icon: <Palette className="size-4" />,
      },
      {
        href: "/render-strategy",
        title: "Render Strategy",
        description: "Server/client rendering",
        icon: <Code2 className="size-4" />,
      },
      {
        href: "/workflow",
        title: "Workflow Builder",
        description: "Visual workflow builder",
        icon: <Workflow className="size-4" />,
      },
    ],
  },
];

export function FancyNav({ user, signUpUrl, signOutAction }: FancyNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProdMode, setIsProdMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Refs for GSAP animations
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Check if running in development
  const isDev = process.env.NODE_ENV === "development";

  // Determine if we should show dev-only items
  // In production: always hide dev items
  // In development: show dev items unless "Prod Mode" is toggled on
  const showDevItems = isDev && !isProdMode;

  // Theme toggle hook (using the hook for potential future use)
  useThemeToggle({
    variant: "circle",
    start: "top-right",
  });

  // Mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to check if a path is active
  const isActivePath = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  // Filter menu items based on dev/prod mode
  const getFilteredSections = useCallback(() => {
    if (showDevItems) {
      // Show all items including dev-only
      return menuSections;
    }
    // Hide dev-only sections and items (production mode)
    return menuSections
      .filter((section) => !section.devOnly)
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.devOnly),
      }));
  }, [showDevItems]);

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

      // Create the main timeline
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
      });

      // Get the initial collapsed height
      const collapsedHeight = pillElement.offsetHeight;

      // Step 1: Hide pill content (0s - 0.3s)
      tl.to(
        ".pill-content",
        {
          opacity: 0,
          scale: 0.8,
          duration: 0.3,
          ease: "power2.in",
        },
        0,
      );

      // Remove pill content from flow (position absolute)
      tl.set(
        ".pill-content",
        {
          position: "absolute",
          pointerEvents: "none",
        },
        0.3,
      );

      // Step 2: Expand width (0.1s - 0.5s) - faster
      tl.to(
        pillRef.current,
        {
          width: "min(800px, 90vw)",
          duration: 0.4,
          ease: "power3.out",
        },
        0.1,
      );

      // Step 3: Show expanded content early (0.3s) so height has content to measure
      tl.set(
        expandedRef.current,
        {
          display: "grid",
          opacity: 0,
        },
        0.3,
      );

      // Step 4: Expand height (0.4s - 1.8s) - slower with better easing
      tl.fromTo(
        pillRef.current,
        {
          height: collapsedHeight,
        },
        {
          height: "auto",
          duration: 1.4,
          ease: "power1.out",
        },
        0.4,
      );

      // Step 5: Fade in expanded content (0.9s)
      tl.to(
        expandedRef.current,
        {
          opacity: 1,
          duration: 0.3,
        },
        0.9,
      );

      tl.from(
        expandedRef.current,
        {
          scale: 0.95,
          y: 10,
          duration: 0.5,
          ease: "back.out(1.5)",
        },
        0.9,
      );

      // Step 5: Stagger menu items (1.0s)
      tl.from(
        ".menu-item",
        {
          opacity: 0,
          x: -15,
          y: 8,
          duration: 0.5,
          stagger: 0.08,
          ease: "back.out(1.5)",
        },
        1.0,
      );

      // Step 6: Show actions (1.4s)
      tl.from(
        actionsRef.current,
        {
          opacity: 0,
          y: 15,
          duration: 0.5,
          ease: "back.out(2)",
        },
        1.4,
      );

      // Store timeline reference
      timelineRef.current = tl;
    },
    { scope: containerRef, dependencies: [mounted, isProdMode] },
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

  if (!mounted) {
    return (
      <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
        <div className="bg-background/80 border-border h-12 w-32 animate-pulse rounded-full border backdrop-blur-md" />
      </div>
    );
  }

  const filteredSections = getFilteredSections();

  return (
    <div
      ref={containerRef}
      className="group fixed top-4 left-1/2 z-50 -translate-x-1/2"
    >
      {/* Main pill/expanded container */}
      <div
        ref={pillRef}
        className={cn(
          "bg-background/95 border-border relative origin-top overflow-hidden rounded-2xl border shadow-lg backdrop-blur-md transition-shadow",
          isExpanded ? "shadow-2xl" : "shadow-lg hover:shadow-xl",
        )}
      >
        {/* Collapsed pill content */}
        <div className="pill-content flex items-center gap-3 px-5 py-3">
          {/* Status indicator - Dynamic Island style */}
          <div className="relative flex items-center">
            <div className="bg-primary/80 absolute -left-1 size-2 animate-pulse rounded-full" />
            <div className="bg-primary/40 absolute -left-1 size-2 animate-ping rounded-full" />
          </div>

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
                O
              </span>
            </div>
            <span className="text-sm whitespace-nowrap">ORG-OS</span>
          </Link>

          {/* Separator */}
          <div className="bg-border h-5 w-px" />

          {/* Quick actions in pill */}
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <ThemeToggleButton
              variant="circle"
              start="top-right"
              className="size-8 transition-transform hover:scale-110"
            />

            {/* Menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 transition-transform hover:scale-110"
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
                <span className="text-primary-foreground font-bold">O</span>
              </div>
              <span className="text-lg font-bold">ORG-OS</span>
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Home link */}
              <div className="menu-item">
                <Link
                  href="/"
                  className={cn(
                    "bg-muted/50 hover:bg-muted flex items-center gap-3 rounded-lg p-3 transition-colors",
                    isActivePath("/") && "bg-primary/10 border-primary border",
                  )}
                >
                  <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                    <span className="text-sm font-bold">H</span>
                  </div>
                  <div>
                    <div className="font-medium">Home</div>
                    <div className="text-muted-foreground text-xs">
                      Welcome page
                    </div>
                  </div>
                </Link>
              </div>

              {/* Docs link */}
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

              {/* Dynamic sections */}
              {filteredSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h3 className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
                    {section.title}
                    {section.devOnly && showDevItems && (
                      <span className="ml-2 text-green-500">(Dev)</span>
                    )}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <div key={item.href} className="menu-item">
                        <Link
                          href={item.href}
                          className={cn(
                            "hover:bg-muted flex items-center gap-3 rounded-lg p-2 transition-colors",
                            isActivePath(item.href) &&
                              "bg-primary/10 text-primary",
                            item.devOnly &&
                              showDevItems &&
                              "border-l-2 border-green-500",
                          )}
                        >
                          <div
                            className={cn(
                              "text-muted-foreground flex size-6 items-center justify-center",
                              isActivePath(item.href) && "text-primary",
                            )}
                          >
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {item.title}
                            </div>
                            <div className="text-muted-foreground truncate text-xs">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions section */}
          <div
            ref={actionsRef}
            className="border-border col-span-full flex items-center justify-between border-t pt-4"
          >
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <ThemeToggleButton
                variant="circle"
                start="top-right"
                className="size-10"
              />

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

      {/* Floating decorative elements */}
      <div
        className={cn(
          "pointer-events-none absolute -z-10 transition-all duration-700",
          isExpanded ? "scale-100 opacity-100" : "scale-90 opacity-0",
        )}
      >
        {/* Glow effects */}
        <div className="bg-primary/30 absolute -top-32 -left-32 size-64 animate-pulse rounded-full blur-3xl" />
        <div className="bg-primary/20 absolute -right-20 -bottom-20 size-48 rounded-full blur-2xl" />
        <div className="absolute -bottom-16 -left-16 size-32 rounded-full bg-blue-500/10 blur-2xl" />

        {/* Grid pattern overlay */}
        <div
          className="absolute -top-40 -left-40 size-[600px] opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(var(--primary-rgb, 0, 0, 0), 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(var(--primary-rgb, 0, 0, 0), 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Pill hover glow effect when collapsed */}
      {!isExpanded && (
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-primary/10 absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      )}
    </div>
  );
}
