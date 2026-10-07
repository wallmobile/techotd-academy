"use server";

import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { startSession, endSession } from "@/lib/auth/session";
import { roleHomeRoute } from "@/lib/auth/roles";
import {
  validateRegisterForm,
  validateLoginForm,
  validateForgotPasswordForm,
  validateResetPasswordForm,
} from "@/lib/validateAuth";
import { createUser, findUserByEmailInternal } from "@/lib/db/users";
import {
  createPasswordResetTokenForEmail,
  getValidPasswordResetToken,
  completePasswordReset,
} from "@/lib/db/passwordResetTokens";

// A bcrypt hash of a random value, compared against when no account exists
// for the submitted email. This keeps login's response time (and its
// generic "invalid credentials" message) the same whether or not the
// email is registered, rather than short-circuiting and leaking account
// existence through a timing difference.
const DUMMY_PASSWORD_HASH =
  "$2b$12$aA5p1XCC17ynTOtsOoDiTuYeylmcoq0J9ODfq53CYFOwVzwXkcI/i";

function fieldValues(formData, fields) {
  return Object.fromEntries(fields.map((field) => [field, formData.get(field) ?? ""]));
}

// --- Register --------------------------------------------------------------
//
// Public registration always creates a STUDENT account. There is no role
// field in the form, and even if a client sent one it would be ignored —
// role elevation only happens through a future protected admin workflow.
export async function registerAction(_prevState, formData) {
  const values = fieldValues(formData, ["name", "email", "phone", "password", "confirmPassword"]);
  values.consent = formData.get("consent") === "on";

  const errors = validateRegisterForm(values);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values: { ...values, password: "", confirmPassword: "" } };
  }

  const existing = findUserByEmailInternal(values.email);
  if (existing) {
    return {
      status: "error",
      errors: {},
      formError: "An account with this email already exists. Try signing in instead.",
      values: { ...values, password: "", confirmPassword: "" },
    };
  }

  const passwordHash = await hashPassword(values.password);
  const user = createUser({
    name: values.name,
    email: values.email,
    phone: values.phone || null,
    passwordHash,
    role: "STUDENT",
  });

  await startSession(user.id);
  redirect(roleHomeRoute(user.role));
}

// --- Login -------------------------------------------------------------
export async function loginAction(_prevState, formData) {
  const values = fieldValues(formData, ["email", "password"]);

  const errors = validateLoginForm(values);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values: { ...values, password: "" } };
  }

  const user = findUserByEmailInternal(values.email);
  const passwordToCompare = user ? user.passwordHash : DUMMY_PASSWORD_HASH;
  const passwordMatches = await verifyPassword(values.password, passwordToCompare);

  if (!user || !passwordMatches) {
    return {
      status: "error",
      errors: {},
      formError: "Invalid email or password.",
      values: { ...values, password: "" },
    };
  }

  if (user.status !== "ACTIVE") {
    return {
      status: "error",
      errors: {},
      formError:
        "This account is not currently active. Please contact TechOTD Academy support for help.",
      values: { ...values, password: "" },
    };
  }

  const remember = formData.get("remember") === "on";
  await startSession(user.id, { remember });
  redirect(roleHomeRoute(user.role));
}

// --- Logout --------------------------------------------------------------
export async function logoutAction() {
  await endSession();
  redirect("/login");
}

// --- Forgot password -----------------------------------------------------
//
// Always returns the same public response regardless of whether the email
// is registered, so the response itself can't be used to enumerate
// accounts. A reset token is only ever created for a real account.
export async function forgotPasswordAction(_prevState, formData) {
  const values = fieldValues(formData, ["email"]);

  const errors = validateForgotPasswordForm(values);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values };
  }

  const result = createPasswordResetTokenForEmail(values.email);

  // No email delivery is configured in this phase (see Phase 7 report), so
  // there is nothing to "send". In development only, the reset link is
  // surfaced directly in the response so the flow can be exercised
  // end-to-end without a mail provider. This must never happen in
  // production, where the link would only ever go out over email.
  const devResetPath =
    result && process.env.NODE_ENV !== "production"
      ? `/reset-password?token=${result.token}`
      : undefined;

  return {
    status: "success",
    message:
      "If an account exists for that email address, password reset instructions will be sent to it.",
    devResetPath,
  };
}

// --- Reset password --------------------------------------------------------
export async function resetPasswordAction(_prevState, formData) {
  const values = fieldValues(formData, ["password", "confirmPassword"]);
  const token = formData.get("token") || "";

  if (!token) {
    return {
      status: "error",
      errors: {},
      formError: "This password reset link is invalid. Please request a new one.",
    };
  }

  const errors = validateResetPasswordForm(values);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values: {} };
  }

  const resetToken = getValidPasswordResetToken(token);
  if (!resetToken) {
    return {
      status: "error",
      errors: {},
      formError: "This password reset link is invalid or has expired. Please request a new one.",
    };
  }

  const passwordHash = await hashPassword(values.password);

  // One transaction: consume the token, set the password, and revoke every
  // existing session for the account (Phase 9.4) — whoever held an old
  // session (including an attacker the reset was meant to lock out) must
  // sign in again with the new password.
  const completed = completePasswordReset({
    tokenId: resetToken.id,
    userId: resetToken.userId,
    passwordHash,
  });
  if (!completed) {
    return {
      status: "error",
      errors: {},
      formError: "This password reset link is invalid or has expired. Please request a new one.",
    };
  }

  return {
    status: "success",
    message: "Your password has been updated. You can now sign in with your new password.",
  };
}

