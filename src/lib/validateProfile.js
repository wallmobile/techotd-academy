// Client-and-server-shared validation for the student profile edit form.
// Mirrors the pattern already used by src/lib/validateAuth.js.

import { NAME_MAX_LENGTH, PHONE_REGEX } from "@/lib/validateAuth";

export const CITY_MAX_LENGTH = 80;
export const BIO_MAX_LENGTH = 500;

export function validateProfileForm(values) {
  const errors = {};

  const name = (values.name || "").trim();
  if (!name) errors.name = "Please enter your full name.";
  else if (name.length < 2 || name.length > NAME_MAX_LENGTH) {
    errors.name = "Name should be between 2 and 80 characters.";
  }

  const phone = (values.phone || "").trim();
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.phone = "Please enter a valid phone number.";
  }

  const city = (values.city || "").trim();
  if (city.length > CITY_MAX_LENGTH) {
    errors.city = `City should be ${CITY_MAX_LENGTH} characters or fewer.`;
  }

  const bio = (values.bio || "").trim();
  if (bio.length > BIO_MAX_LENGTH) {
    errors.bio = `Bio should be ${BIO_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}
