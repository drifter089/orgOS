"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Book, Code, FileText, Home, Menu } from "lucide-react";

import { ThemeSwitch } from "@/components/navbar/ThemeSwitch.client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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
      { title: "Patterns", href: "/docs/architecture/patterns", icon: Code },
    ],
  },
];

function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4">
        <Link
          href="/docs"
          className="group flex items-center gap-3 transition-all duration-200 hover:scale-105"
        >
          <div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-2 transition-colors duration-200">
            <Book className="text-primary h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Documentation
          </span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-8 py-4">
          {docsRoutes.map((section) => (
            <div key={section.title} className="space-y-3">
              <h4 className="text-muted-foreground/70 px-4 text-xs font-semibold tracking-wider uppercase">
                {section.title}
              </h4>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 transition-all duration-200",
                          "hover:translate-x-1",
                          isActive && "bg-secondary font-medium shadow-sm",
                          !isActive && "hover:bg-accent/50",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 transition-colors duration-200",
                            isActive && "text-primary",
                          )}
                        />
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

      <div className="shrink-0 border-t px-4 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-accent transition-all duration-200 hover:scale-105"
            >
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
      <aside className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-16 hidden h-[calc(100vh-4rem)] w-72 overflow-hidden border-r backdrop-blur lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-16 z-50 flex items-center justify-between border-b px-6 py-5 backdrop-blur lg:hidden">
        <Link
          href="/docs"
          className="group flex items-center gap-3 transition-all duration-200 hover:scale-105"
        >
          <div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-2 transition-colors duration-200">
            <Book className="text-primary h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Docs</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeSwitch />
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hover:bg-accent transition-all duration-200 hover:scale-105"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}
