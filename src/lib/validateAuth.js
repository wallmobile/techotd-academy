// Client-and-server-shared validation for the authentication forms.
// Mirrors the pattern already used by src/lib/validateEnquiry.js.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+?\d{1,3}[\s-]?)?\d{10}$/;

export const PASSWORD_MIN_LENGTH = 8;
export const NAME_MAX_LENGTH = 80;

export function validateRegisterForm(values) {
  const errors = {};

  const name = (values.name || "").trim();
  if (!name) errors.name = "Please enter your full name.";
  else if (name.length < 2 || name.length > NAME_MAX_LENGTH) {
    errors.name = "Name should be between 2 and 80 characters.";
  }

  const email = (values.email || "").trim();
  if (!email) errors.email = "Please enter your email address.";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Please enter a valid email address.";

  const phone = (values.phone || "").trim();
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.phone = "Please enter a valid phone number.";
  }

  const password = values.password || "";
  if (!password) errors.password = "Please create a password.";
  else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  const confirmPassword = values.confirmPassword || "";
  if (!confirmPassword) errors.confirmPassword = "Please confirm your password.";
  else if (password && confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!values.consent) {
    errors.consent = "Please accept the terms to create an account.";
  }

  return errors;
}

export function validateLoginForm(values) {
  const errors = {};

  const email = (values.email || "").trim();
  if (!email) errors.email = "Please enter your email address.";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Please enter a valid email address.";

  if (!values.password) errors.password = "Please enter your password.";

  return errors;
}

export function validateForgotPasswordForm(values) {
  const errors = {};
  const email = (values.email || "").trim();
  if (!email) errors.email = "Please enter your email address.";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Please enter a valid email address.";
  return errors;
}

export function validateResetPasswordForm(values) {
  const errors = {};

  const password = values.password || "";
  if (!password) errors.password = "Please create a new password.";
  else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  const confirmPassword = values.confirmPassword || "";
  if (!confirmPassword) errors.confirmPassword = "Please confirm your new password.";
  else if (password && confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

// Change-password (Phase 8.8), distinct from reset-password: this flow
// requires the current password too (a reset-via-email token is proof of
// identity on its own; being logged in is not — someone at an
// already-open, unattended session shouldn't be able to change the
// password without knowing it).
export function validateChangePasswordForm(values) {
  const errors = {};

  if (!values.currentPassword) {
    errors.currentPassword = "Please enter your current password.";
  }

  const password = values.password || "";
  if (!password) errors.password = "Please create a new password.";
  else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  const confirmPassword = values.confirmPassword || "";
  if (!confirmPassword) errors.confirmPassword = "Please confirm your new password.";
  else if (password && confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (password && values.currentPassword && password === values.currentPassword) {
    errors.password = "Your new password must be different from your current password.";
  }

  return errors;
}

export { EMAIL_REGEX, PHONE_REGEX };
