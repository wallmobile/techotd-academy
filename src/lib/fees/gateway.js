// Payment-gateway integration BOUNDARY (Phase 10.4).
//
// STATUS: no payment gateway is configured or integrated in this project —
// no provider SDK, no credentials, no checkout, and no webhook route exist,
// and the app never claims an online payment succeeded. Money is only
// recorded by authorized staff (manual, offline payments).
//
// This module is the single place a real provider will plug in:
//
//  1. Set PAYMENT_PROVIDER (e.g. the provider's name) and
//     PAYMENT_WEBHOOK_SECRET (server-side only, never NEXT_PUBLIC_*) in the
//     server environment.
//  2. Add a route handler (e.g. src/app/api/payments/webhook/route.js) that
//     reads the RAW request body and calls verifyWebhookSignature() with
//     the provider's signature header — rejecting the request on failure —
//     then maps the provider's payload to confirmGatewayPayment().
//  3. Confirm amounts/currency against the fee plan (done inside
//     confirmGatewayPayment) and never treat a browser redirect as proof.
//
// confirmGatewayPayment() is idempotent per (provider, eventId) and per
// (provider, providerReference), rejects amount/currency mismatches and
// overpayment, and is safe against replays and out-of-order delivery. It
// must only be called after signature verification.

import crypto from "node:crypto";
import { recordGatewayPaymentTx, getFeePlanById } from "@/lib/db/fees";
import { parseAmountToMinor } from "@/lib/money";

export function isGatewayConfigured() {
  return Boolean(process.env.PAYMENT_PROVIDER && process.env.PAYMENT_WEBHOOK_SECRET);
}

// Constant-time HMAC-SHA256 hex signature check over the raw body. Returns
// false (never throws) for missing inputs or malformed signatures.
export function verifyWebhookSignature(rawBody, signatureHex, secret = process.env.PAYMENT_WEBHOOK_SECRET) {
  if (typeof rawBody !== "string" || typeof signatureHex !== "string" || !secret) return false;
  if (!/^[0-9a-f]{64}$/i.test(signatureHex)) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const given = Buffer.from(signatureHex, "hex");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// `amount` is the provider's decimal string; it is parsed to integer minor
// units and must be > 0. Never call this with unverified input.
export function confirmGatewayPayment({ provider, eventId, providerReference, feePlanId, amount, currency, paidOn }) {
  if (![provider, eventId, providerReference, feePlanId].every((v) => typeof v === "string" && v.length > 0 && v.length <= 200)) {
    return { ok: false, reason: "invalid_event" };
  }
  const amountMinor = parseAmountToMinor(typeof amount === "string" ? amount : "");
  if (amountMinor === null || amountMinor <= 0) return { ok: false, reason: "invalid_amount" };
  const plan = getFeePlanById(feePlanId);
  if (!plan) return { ok: false, reason: "unknown_fee" };
  if (currency !== plan.currency) return { ok: false, reason: "currency_mismatch" };

  const date = typeof paidOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(paidOn) ? paidOn : new Date().toISOString().slice(0, 10);
  return recordGatewayPaymentTx({ provider, eventId, providerReference, feePlanId, amountMinor, currency, paidOn: date });
}
