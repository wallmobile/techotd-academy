import { test } from "node:test";
import assert from "node:assert/strict";
import { sendEmail, getEmailConfig } from "@/lib/notifications/email";
import { inspectEnvironment } from "@/lib/config";

const SMTP_ENV = { EMAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.example.test", SMTP_USER: "alerts@example.test", SMTP_PASS: "app-pass-do-not-log" };

function fakeTransport(result) {
  const calls = [];
  return {
    calls,
    sendMail: async (message) => {
      calls.push(message);
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

test("smtp config: needs host, user and password; port defaults to 587; from defaults to the login", () => {
  const config = getEmailConfig(SMTP_ENV);
  assert.equal(config.provider, "smtp");
  assert.equal(config.port, 587);
  assert.equal(config.from, "TechOTD Academy <alerts@example.test>");
  assert.equal(getEmailConfig({ ...SMTP_ENV, SMTP_PORT: "465", EMAIL_FROM: "X <x@example.test>" }).from, "X <x@example.test>");
  assert.equal(getEmailConfig({ ...SMTP_ENV, SMTP_PORT: "465" }).port, 465);
  for (const missing of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) assert.equal(getEmailConfig({ ...SMTP_ENV, [missing]: "" }), null, missing);
  assert.equal(getEmailConfig({ ...SMTP_ENV, SMTP_PORT: "abc" }), null);
  assert.equal(getEmailConfig({ ...SMTP_ENV, SMTP_PASS: "abcd efgh ijkl mnop" }).pass, "abcdefghijklmnop", "Google app-password spaces are dropped");
  assert.equal(getEmailConfig({ ...SMTP_ENV, SMTP_PASS: "my pass word" }).pass, "my pass word", "other passwords are left alone");
});

test("smtp send: passes from/to/subject/body and reply-to; returns the message id", async () => {
  const config = getEmailConfig(SMTP_ENV);
  const transport = fakeTransport({ messageId: "<abc@example.test>" });
  const r = await sendEmail({ to: "lead@example.test", subject: "S", text: "T", html: "<p>T</p>", replyTo: "visitor@example.test" }, { config, transportImpl: transport });
  assert.deepEqual(r, { ok: true, providerMessageId: "<abc@example.test>" });
  assert.equal(transport.calls.length, 1);
  const m = transport.calls[0];
  assert.equal(m.from, config.from);
  assert.equal(m.to, "lead@example.test");
  assert.equal(m.replyTo, "visitor@example.test");
  assert.ok(!JSON.stringify(m).includes(SMTP_ENV.SMTP_PASS), "the password is never in the message");

  const noReply = fakeTransport({ messageId: "x" });
  await sendEmail({ to: "lead@example.test", subject: "S", text: "T", html: "T", replyTo: "not an email" }, { config, transportImpl: noReply });
  assert.equal("replyTo" in noReply.calls[0], false);
});

test("smtp send: failures are classified and never throw", async () => {
  const config = getEmailConfig(SMTP_ENV);
  const err = (props) => Object.assign(new Error("x"), props);
  const cases = [
    [err({ code: "EAUTH", responseCode: 535 }), { ok: false, retryable: false, code: "smtp_535" }],
    [err({ code: "EAUTH" }), { ok: false, retryable: false, code: "smtp_auth" }],
    [err({ responseCode: 421 }), { ok: false, retryable: true, code: "smtp_421" }],
    [err({ responseCode: 550 }), { ok: false, retryable: false, code: "smtp_550" }],
    [err({ code: "ETIMEDOUT" }), { ok: false, retryable: true, code: "timeout" }],
    [err({ code: "ECONNREFUSED" }), { ok: false, retryable: true, code: "network_error" }],
  ];
  for (const [error, expected] of cases) {
    assert.deepEqual(await sendEmail({ to: "a@example.test", subject: "S", text: "T", html: "T" }, { config, transportImpl: fakeTransport(error) }), expected);
  }
  const bad = fakeTransport({ messageId: "x" });
  assert.equal((await sendEmail({ to: "nope", subject: "S", text: "T", html: "T" }, { config, transportImpl: bad })).code, "invalid_recipient");
  assert.equal(bad.calls.length, 0);
});

test("config report: SMTP is recognised, and LEAD_ALERT_EMAIL is satisfied by it", () => {
  const base = { NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://staging.example.org", DATABASE_URL: "postgres://app:pw@db.example.org:5432/app?sslmode=require", TRUSTED_PROXY_HOPS: "1" };
  const ready = inspectEnvironment({ ...base, ...SMTP_ENV, LEAD_ALERT_EMAIL: "leads@example.org" });
  assert.deepEqual(ready.warnings, []);
  assert.equal(ready.vars.SMTP_PASS, "present");

  const partial = inspectEnvironment({ ...base, ...SMTP_ENV, SMTP_PASS: "", LEAD_ALERT_EMAIL: "leads@example.org" });
  assert.ok(partial.warnings.some((w) => /Email \(SMTP\) is partly configured \(missing SMTP_PASS\)/.test(w)));
  assert.ok(partial.warnings.some((w) => /LEAD_ALERT_EMAIL is set but email \(SMTP\) is not fully configured/.test(w)));

  const unknown = inspectEnvironment({ ...base, EMAIL_PROVIDER: "sendgrid" });
  assert.ok(unknown.warnings.some((w) => /EMAIL_PROVIDER \(must be 'resend' or 'smtp'\)/.test(w)));
});
