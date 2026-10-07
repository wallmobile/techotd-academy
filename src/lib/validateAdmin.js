// Validation for admin forms (Phase 10.1). Reuses the registration rules
// (name length, email format, phone format, password minimum) instead of
// duplicating them: the same validator runs with the fields the admin form
// doesn't have (confirmation, consent) satisfied.

import { validateRegisterForm } from "@/lib/validateAuth";

export function validateCreateTrainerForm(values) {
  const { name, email, phone, password } = validateRegisterForm({
    ...values,
    confirmPassword: values.password,
    consent: true,
  });
  const errors = { name, email, phone, password };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}
