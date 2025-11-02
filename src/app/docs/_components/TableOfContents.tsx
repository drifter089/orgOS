"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const pathname = usePathname();

  useEffect(() => {
    // Reset active state when navigating to a new page
    setActiveId("");

    // Extract all h2, h3, h4 headings from the page
    const elements = Array.from(
      document.querySelectorAll("article h2, article h3, article h4"),
    );

    const headingData: Heading[] = elements
      .map((element) => ({
        id: element.id,
        text: element.textContent ?? "",
        level: parseInt(element.tagName.slice(1), 10),
      }))
      .filter((heading) => heading.id && heading.text); // Only include headings with IDs and text

    setHeadings(headingData);

    // Set up IntersectionObserver for active section tracking
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0px -80% 0px", // Trigger when heading is near top of viewport
        threshold: 1,
      },
    );

    // Observe all heading elements
    elements.forEach((element) => {
      if (element.id) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [pathname]); // Re-run when pathname changes (navigation)

  if (headings.length === 0) {
    return null; // Don't show TOC if no headings
  }

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-20 w-64">
        <div className="space-y-2">
          <h4 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wider uppercase">
            On This Page
          </h4>
          <nav>
            <ul className="space-y-2.5">
              {headings.map((heading) => (
                <li
                  key={heading.id}
                  style={{
                    paddingLeft: `${(heading.level - 2) * 0.75}rem`,
                  }}
                >
                  <a
                    href={`#${heading.id}`}
                    className={cn(
                      "hover:text-foreground block text-sm transition-all duration-200",
                      activeId === heading.id
                        ? "text-primary font-medium"
                        : "text-muted-foreground",
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(heading.id);
                      if (element) {
                        element.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                        // Update URL without triggering navigation
                        window.history.pushState(null, "", `#${heading.id}`);
                      }
                    }}
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </aside>
  );
}
