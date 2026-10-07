"use client";

import { useEffect, useRef } from "react";

/**
 * A thin gradient bar fixed to the top of the viewport that fills as the page
 * scrolls. Updates a CSS transform through a ref, so scrolling never re-renders React.
 */
export function ScrollProgress() {
  const barRef = useRef(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
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
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-60 h-[3px]">
      <div
        ref={barRef}
        className="h-full origin-left bg-linear-to-r from-primary via-secondary to-primary"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
