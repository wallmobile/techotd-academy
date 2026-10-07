/**
 * Shared Framer Motion variants for the global animation foundation.
 * Keep motion subtle, fast, and professional — see design system rules.
 * All variants are safe no-ops when the user prefers reduced motion,
 * because <MotionConfig reduceMotion="user"> is applied at the root layout.
 */

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export const slideUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

/** Stagger helper for parent containers revealing a list of children. */
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

/** Standard viewport config for scroll-triggered reveals. */
export const revealViewport = { once: true, margin: "-80px" };
