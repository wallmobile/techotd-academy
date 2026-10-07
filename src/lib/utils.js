import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class strings safely, resolving conflicting utilities
 * (e.g. "px-2" vs "px-4") in favor of the later one.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
