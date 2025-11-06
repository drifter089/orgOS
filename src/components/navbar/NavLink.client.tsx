"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  prefetch?: boolean;
}

export function NavLink({ href, children, prefetch = true }: NavLinkProps) {
  const pathname = usePathname();

  // Check if this link is active
  // Special case for home page: only match exact "/"
  const isActive =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <Button
      variant="ghost"
      asChild
      className={cn(
        "hover:bg-accent hover:text-accent-foreground relative transition-all duration-200",
        isActive && "bg-accent/50 text-accent-foreground font-semibold",
      )}
    >
      <Link href={href} prefetch={prefetch}>
        {children}
        {isActive && (
          <span className="bg-primary absolute bottom-0 left-1/2 h-0.5 w-3/4 -translate-x-1/2 rounded-full shadow-sm" />
        )}
      </Link>
    </Button>
  );
}
