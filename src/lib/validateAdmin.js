// Validation for admin forms (Phase 10.1). Reuses the registration rules
// (name length, email format, phone format, password minimum) instead of
// duplicating them: the same validator runs with the fields the admin form
// doesn't have (confirmation, consent) satisfied.

import { validateRegisterForm } from "@/lib/validateAuth";
import { CREATABLE_STAFF_ROLES } from "@/constants/roles";

export function validateCreateTrainerForm(values) {
  const { name, email, phone, password } = validateRegisterForm({
    ...values,
    confirmPassword: values.password,
    consent: true,
  });
  const errors = { name, email, phone, password };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

// Super Admin "create staff account": same rules as the trainer form plus a
// role that must be one of the creatable staff roles.
export function validateCreateStaffForm(values) {
  const errors = validateCreateTrainerForm(values);
  if (!CREATABLE_STAFF_ROLES.includes(values.role)) errors.role = "Please choose a role.";
  return errors;
}
