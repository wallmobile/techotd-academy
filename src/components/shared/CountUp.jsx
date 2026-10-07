"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up from 0 when it scrolls into view. Accepts numbers or
 * strings with a numeric prefix and a suffix ("9+", "12k"). The final value
 * is rendered on the server, and users who prefer reduced motion simply see it.
 */
export function CountUp({ value, duration = 1400 }) {
  const text = String(value);
  const match = /^(\d+)(.*)$/.exec(text);
  const target = match ? Number(match[1]) : null;
  const suffix = match ? match[2] : "";

  const ref = useRef(null);
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (target === null) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const element = ref.current;
    if (!element) return undefined;

    let frame = 0;
    let started = false;

    const run = () => {
      const startedAt = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        setDisplay(Math.round(target * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !started) {
          started = true;
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target, duration]);

  if (target === null) return <span>{text}</span>;
  return (
    <span ref={ref} aria-label={text}>
      <span aria-hidden="true">
        {display}
        {suffix}
      </span>
    </span>
  );
}
