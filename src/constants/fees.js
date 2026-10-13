// Client-safe fee / payment constants (Phase 10.4).

// Roles that may manage fee plans and record payments. ACCOUNTANT is
// included because finance is their purpose; counsellors, trainers,
// content / placement managers and students have no financial mutation.
export const FINANCE_ROLES = ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"];

// Only INR is configured. Adding a currency is a deliberate one-line change
// here (amounts are stored as integer minor units, 2 decimals assumed).
export const SUPPORTED_CURRENCIES = ["INR"];
export const DEFAULT_CURRENCY = "INR";

// Methods staff can pick when recording an offline payment. GATEWAY is
// reserved for payments verified by a payment provider and is never
// selectable manually.
export const MANUAL_PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"];
export const PAYMENT_METHOD_LABELS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  OTHER: "Other",
  GATEWAY: "Online (gateway)",
};

// Derived (never stored) fee statuses.
export const FEE_STATUS_LABELS = {
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS = {
  RECORDED: "Recorded manually",
  VERIFIED: "Verified by gateway",
  VOIDED: "Voided",
};

export const FEES_PAGE_SIZE = 20;
export const NOTE_MAX_LENGTH = 500;
