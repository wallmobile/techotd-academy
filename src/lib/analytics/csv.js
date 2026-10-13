// CSV serialization for report exports (Phase 10.8).
//
// - RFC 4180 quoting: fields containing a comma, double quote, CR or LF are
//   wrapped in quotes and embedded quotes doubled.
// - Spreadsheet formula injection: a TEXT cell whose first character is
//   =, +, -, @, tab or carriage return would be evaluated by Excel/Sheets,
//   so it is prefixed with a single quote. Genuine numbers are written
//   as-is (they are numbers, not attacker-controlled text).
// - A UTF-8 BOM is prepended so spreadsheet apps read non-ASCII correctly.

const DANGEROUS_START = /^[=+\-@\t\r]/;

export function csvCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = String(value);
  if (DANGEROUS_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(header, rows) {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
