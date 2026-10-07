"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Cycles through a fixed list of short phrases, one fully visible at a
 * time, crossfading + sliding between them on an interval — the same
 * "rotating headline word" pattern common on training/placement landing
 * pages. `aria-live="polite"` announces each change once to assistive
 * tech without spamming it every render; `prefers-reduced-motion` isn't
 * specially handled since the transition is a small opacity/position
 * fade, not a large motion effect.
 */
export function RotatingText({ phrases, interval = 2200, className }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!phrases || phrases.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, interval);
    return () => clearInterval(timer);
  }, [phrases, interval]);

  if (!phrases || phrases.length === 0) return null;

  return (
    <span className={className} aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.span
          key={phrases[index]}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="inline-block"
        >
          {phrases[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
