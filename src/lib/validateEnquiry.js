/**
 * Client-side validation for the enquiry / book-demo forms. Kept
 * separate from the form component so it's easy to unit test and
 * reuse if a future phase adds server-side validation too.
 */

// Accepts an optional country code (1–3 digits) plus a 10-digit number,
// so Indian numbers validate cleanly while leaving room for other
// country codes rather than hard-restricting to +91 only.
const PHONE_REGEX = /^(\+?\d{1,3}[\s-]?)?\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGE_MAX_LENGTH = 600;

export function validateEnquiryForm(values, variant) {
  const errors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = "Please enter your full name.";
  } else if (name.length < 2 || name.length > 80) {
    errors.name = "Name should be between 2 and 80 characters.";
  }

  const phone = values.phone.trim();
  if (!phone) {
    errors.phone = "Please enter a phone number.";
  } else if (!PHONE_REGEX.test(phone.replace(/[\s-]/g, ""))) {
    errors.phone = "Enter a valid phone number, e.g. 98765 43210.";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Please enter your email address.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (values.message && values.message.length > MESSAGE_MAX_LENGTH) {
    errors.message = `Message should be under ${MESSAGE_MAX_LENGTH} characters.`;
  }

  if (variant === "book-demo" && values.mode === "corporate" && !values.organization.trim()) {
    errors.organization = "Please enter your organization name.";
  }

  // The compact hero enquiry widget has no separate consent checkbox — it
  // shows a static "by submitting you agree to be contacted" line instead
  // (same legal intent, less friction for a 4-field quick form) and always
  // submits with consent: true, so it's exempt from this check.
  if (variant !== "quick" && !values.consent) {
    errors.consent = "Please confirm you're okay with being contacted about this request.";
  }

  return errors;
}

export { MESSAGE_MAX_LENGTH };
