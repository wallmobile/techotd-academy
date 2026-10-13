// Money helpers (Phase 10.4). Amounts are integer MINOR units (paise) end to
// end; floats are never used for totals or comparisons. User-entered
// decimals are parsed from the string itself, not via parseFloat.

const AMOUNT_PATTERN = /^\d{1,9}(\.\d{1,2})?$/;

// "12500" -> 1250000, "12500.5" -> 1250050, "0.99" -> 99.
// Returns null for anything else (negative, exponent, >2 decimals, empty,
// non-string, absurdly large).
export function parseAmountToMinor(input) {
  if (typeof input !== "string") return null;
  const value = input.trim().replace(/,/g, "");
  if (!AMOUNT_PATTERN.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

// Display only (never fed back into calculations).
export function formatMinor(minor, currency = "INR") {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const major = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, "0");
  const grouped = new Intl.NumberFormat("en-IN").format(major);
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${negative ? "-" : ""}${symbol}${grouped}.${cents}`;
}

// Plain "1234.50" for pre-filling a form field.
export function minorToInput(minor) {
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}
