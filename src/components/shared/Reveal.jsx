"use client";

import { motion } from "framer-motion";
import { slideUp, revealViewport } from "@/lib/motion";

/**
 * Scroll-triggered reveal wrapper. Keeps homepage sections as Server
 * Components while isolating the Framer Motion (client-only) part to
 * just this small boundary.
 */
export function Reveal({ variants = slideUp, delay = 0, className, children, ...props }) {
  // `delay` (ms) staggers independent reveals without needing a parent container.
  const resolved = delay
    ? {
        ...variants,
        visible: {
          ...variants.visible,
          transition: { ...variants.visible?.transition, delay: delay / 1000 },
        },
      }
    : variants;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      variants={resolved}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Child item for use inside a <Reveal variants={staggerContainer}> parent. */
export function RevealItem({ as = "div", variants = slideUp, className, children, ...props }) {
  const MotionTag = motion[as];
  return (
    <MotionTag variants={variants} className={className} {...props}>
      {children}
    </MotionTag>
  );
}
