"use client";

import { MotionConfig } from "framer-motion";

/**
 * Applies `prefers-reduced-motion` handling globally: when the user's
 * OS setting requests reduced motion, Framer Motion swaps animations
 * for instant transitions everywhere in the app.
 */
export function MotionProvider({ children }) {
  return <MotionConfig reduceMotion="user">{children}</MotionConfig>;
}
