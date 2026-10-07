import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class strings safely, resolving conflicting utilities
 * (e.g. "px-2" vs "px-4") in favor of the later one.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a SQLite datetime('now') value ("YYYY-MM-DD HH:MM:SS", UTC) for
 * display. Returns an em dash for empty input.
 */
export function formatDbDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
