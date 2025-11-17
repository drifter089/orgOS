"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Building2,
  Code2,
  FlaskConical,
  Palette,
  Plug,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

/**
 * NavMenu - Main navigation component using shadcn NavigationMenu
 * Organizes pages into logical groups with dropdown submenus
 */
export function NavMenu() {
  const pathname = usePathname();

  // Helper to check if a path is active
  const isActivePath = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-2">
        {/* Home - Standalone link */}
        <NavigationMenuItem>
          <NavigationMenuLink
            asChild
            className={cn(
              navigationMenuTriggerStyle(),
              isActivePath("/") && "bg-accent/50 font-semibold",
            )}
          >
            <Link href="/">Home</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        {/* Organization - Dropdown with Org and Teams */}
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              isActivePath("/org") ||
                isActivePath("/teams") ||
                isActivePath("/integration") ||
                isActivePath("/metric") ||
                isActivePath("/api-test")
                ? "bg-accent/50 font-semibold"
                : "",
            )}
          >
            Organization
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              <ListItem
                href="/org"
                title="Organization"
                icon={<Building2 className="text-primary size-5" />}
                active={isActivePath("/org")}
              >
                Manage your organization settings, members, and configuration
              </ListItem>
              <ListItem
                href="/teams"
                title="Teams"
                icon={<Users className="text-primary size-5" />}
                active={isActivePath("/teams")}
              >
                Browse and manage teams within your organization
              </ListItem>
              <ListItem
                href="/integration"
                title="Integrations"
                icon={<Plug className="text-primary size-5" />}
                active={isActivePath("/integration")}
              >
                Connect and manage 3rd party service integrations
              </ListItem>
              <ListItem
                href="/metric"
                title="Metrics"
                icon={<TrendingUp className="text-primary size-5" />}
                active={isActivePath("/metric")}
              >
                Track and manage key performance indicators
              </ListItem>
              <ListItem
                href="/api-test"
                title="API Testing"
                icon={<FlaskConical className="text-primary size-5" />}
                active={isActivePath("/api-test")}
              >
                Test integration endpoints and verify connectivity
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Features - Dropdown with demo pages */}
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              isActivePath("/design-strategy") ||
                isActivePath("/render-strategy") ||
                isActivePath("/workflow")
                ? "bg-accent/50 font-semibold"
                : "",
            )}
          >
            Features
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              <ListItem
                href="/design-strategy"
                title="Design Strategy"
                icon={<Palette className="text-primary size-5" />}
                active={isActivePath("/design-strategy")}
              >
                Explore design patterns and component showcase
              </ListItem>
              <ListItem
                href="/render-strategy"
                title="Render Strategy"
                icon={<Code2 className="text-primary size-5" />}
                active={isActivePath("/render-strategy")}
              >
                Learn about server/client rendering and data fetching patterns
              </ListItem>
              <ListItem
                href="/workflow"
                title="Workflow Builder"
                icon={<Workflow className="text-primary size-5" />}
                active={isActivePath("/workflow")}
              >
                Visual workflow builder with React Flow
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Docs - Standalone link */}
        <NavigationMenuItem>
          <NavigationMenuLink
            asChild
            className={cn(
              navigationMenuTriggerStyle(),
              isActivePath("/docs") && "bg-accent/50 font-semibold",
            )}
          >
            <Link href="/docs">Docs</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

/**
 * ListItem - Reusable navigation menu item for dropdown content
 * Displays icon, title, description with proper hover/active states
 */
interface ListItemProps {
  href: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

function ListItem({ href, title, icon, children, active }: ListItemProps) {
  return (
    <li>
      <NavigationMenuLink asChild active={active}>
        <Link
          href={href}
          className={cn(
            "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none",
            active && "bg-accent/50 font-semibold",
          )}
        >
          <div className="flex items-center gap-2">
            {icon}
            <div className="text-sm leading-none font-medium">{title}</div>
          </div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
