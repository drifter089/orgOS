"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, FileText, Home, Book, Code } from "lucide-react";
import { ThemeSwitch } from "@/components/navbar/ThemeSwitch.client";

const docsRoutes = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs", icon: Home },
      { title: "Installation", href: "/docs/getting-started", icon: FileText },
    ],
  },
  {
    title: "Architecture",
    items: [
      { title: "Overview", href: "/docs/architecture", icon: Book },
      { title: "Concepts", href: "/docs/architecture/concepts", icon: Book },
      { title: "Decisions", href: "/docs/architecture/decisions", icon: FileText },
      { title: "Patterns", href: "/docs/architecture/patterns", icon: Code },
      { title: "Workflow", href: "/docs/architecture/workflow", icon: FileText },
      { title: "Performance", href: "/docs/architecture/performance", icon: FileText },
    ],
  },
  {
    title: "Components",
    items: [
      { title: "Overview", href: "/docs/components", icon: Code },
      { title: "Examples", href: "/docs/examples", icon: Book },
    ],
  },
];

function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="px-4">
        <Link href="/docs" className="flex items-center gap-2">
          <Book className="h-6 w-6" />
          <span className="text-xl font-bold">Documentation</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-6">
          {docsRoutes.map((section) => (
            <div key={section.title}>
              <h4 className="text-muted-foreground mb-2 px-4 text-sm font-semibold">
                {section.title}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-2",
                          isActive && "bg-secondary",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t px-4 pt-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Back to App
            </Button>
          </Link>
          <ThemeSwitch />
        </div>
      </div>
    </div>
  );
}

export function DocsSidebar() {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="bg-background sticky top-0 hidden h-screen w-64 overflow-hidden border-r lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="bg-background sticky top-0 z-50 flex items-center justify-between border-b p-4 lg:hidden">
        <Link href="/docs" className="flex items-center gap-2">
          <Book className="h-6 w-6" />
          <span className="text-xl font-bold">Docs</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}
