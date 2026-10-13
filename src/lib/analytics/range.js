// Report date ranges (Phase 10.8).
//
// TIMEZONE: every boundary is a UTC calendar day. The database stores
// timestamps as UTC ("YYYY-MM-DD HH:MM:SS"), so "today" and the day buckets
// are UTC days, not the viewer's local day. A range is inclusive of both
// its first and last day.

import { PRESETS, DEFAULT_PRESET, MAX_RANGE_DAYS } from "@/constants/analytics";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isValidDay(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(day, n) {
  return dayString(new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY_MS));
}

export function daysBetween(fromDay, toDay) {
  return Math.round((new Date(`${toDay}T00:00:00Z`) - new Date(`${fromDay}T00:00:00Z`)) / DAY_MS) + 1;
}

/**
 * Parses ?preset=&from=&to= into { preset, from, to, fromTs, toTs, days,
 * error? }. Never throws: invalid input falls back to the default preset and
 * reports a message. `now` is injectable for tests.
 *  - from/to: inclusive YYYY-MM-DD days
 *  - fromTs: "YYYY-MM-DD 00:00:00" (inclusive), toTs: day after `to` at
 *    00:00:00 (exclusive) — for string comparison against stored timestamps.
 */
export function parseRange(input = {}, now = new Date()) {
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  const today = dayString(now);
  let preset = String(first(input.preset) ?? "").trim();
  if (!PRESETS.includes(preset)) preset = DEFAULT_PRESET;

  let from;
  let to = today;
  let error = null;

  if (preset === "today") {
    from = today;
  } else if (preset === "last7") {
    from = addDays(today, -6);
  } else if (preset === "month") {
    from = `${today.slice(0, 7)}-01`;
  } else if (preset === "custom") {
    const f = String(first(input.from) ?? "").trim();
    const t = String(first(input.to) ?? "").trim();
    if (!isValidDay(f) || !isValidDay(t)) {
      error = "Enter a valid start and end date.";
    } else if (f > t) {
      error = "The start date must not be after the end date.";
    } else if (daysBetween(f, t) > MAX_RANGE_DAYS) {
      error = `Ranges can be at most ${MAX_RANGE_DAYS} days.`;
    } else if (t > today) {
      error = "The end date can't be in the future.";
    } else {
      from = f;
      to = t;
    }
    if (error) {
      preset = DEFAULT_PRESET;
      from = addDays(today, -29);
      to = today;
    }
  } else {
    from = addDays(today, -29);
  }

  return {
    preset,
    from,
    to,
    fromTs: `${from} 00:00:00`,
    toTs: `${addDays(to, 1)} 00:00:00`,
    days: daysBetween(from, to),
    error,
  };
}

// All days in the range, for zero-filled time series.
export function listDays(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
