"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Sticky in-page navigation for the course detail page. Highlights the
 * section currently in view (scroll-spy) and keeps the main CTA in reach.
 */
export function CourseSubNav({ items, ctaHref, ctaLabel = "Book Free Counselling" }) {
  const [active, setActive] = useState(null);

  useEffect(() => {
    let frame = 0;

    // Active section = the last one whose top has passed ~35% of the viewport.
    // Above the first section nothing is highlighted.
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current = null;
      for (const item of items) {
        const element = document.getElementById(item.id);
        if (element && element.getBoundingClientRect().top <= line) current = item.id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <div className="sticky top-20 z-30 border-b border-border bg-white/85 backdrop-blur-md">
      <Container className="flex items-center justify-between gap-4">
        <nav aria-label="Course sections" className="-mx-1 flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const isActive = active === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                  isActive ? "bg-dark text-white shadow-soft" : "text-text hover:bg-surface hover:text-primary"
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <Button href={ctaHref} size="sm" className="hidden shrink-0 bg-linear-to-r from-primary to-secondary shadow-md shadow-primary/25 md:inline-flex">
          {ctaLabel}
        </Button>
      </Container>
    </div>
  );
}
