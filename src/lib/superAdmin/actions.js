"use server";

// Super Admin Server Actions. The caller is derived from the session inside
// the domain function (getSuperAdminContext) — a non-Super-Admin invoking the
// action directly gets a generic refusal and nothing is written. The role in
// the form is a value to validate against CREATABLE_STAFF_ROLES, never proof
// of anything.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSuperAdminContext } from "@/lib/superAdmin/context";
import { createStaffAccount } from "@/lib/superAdmin/staff";
import { validateCreateStaffForm } from "@/lib/validateAdmin";

const FORBIDDEN = "You don't have permission to do that.";

function fieldValues(formData, fields) {
  return Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")]));
}

export async function createStaffAction(_prevState, formData) {
  // Password is never echoed back in `values`.
  const values = fieldValues(formData, ["name", "email", "phone", "password", "role"]);
  const safeValues = { name: values.name, email: values.email, phone: values.phone, role: values.role };

  if (!(await getSuperAdminContext())) return { status: "error", errors: {}, formError: FORBIDDEN, values: safeValues };

  const errors = validateCreateStaffForm(values);
  if (Object.keys(errors).length > 0) return { status: "error", errors, values: safeValues };

  const result = await createStaffAccount({
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    password: values.password,
    role: values.role,
  });

  if (!result.ok) {
    return {
      status: "error",
      errors:
        result.reason === "duplicate_email"
          ? { email: "An account with this email already exists." }
          : result.reason === "invalid_role"
            ? { role: "Please choose a valid role." }
            : {},
      formError: result.reason === "forbidden" ? FORBIDDEN : ["duplicate_email", "invalid_role"].includes(result.reason) ? null : "Could not create the account.",
      values: safeValues,
    };
  }

  revalidatePath("/super-admin");
  revalidatePath("/super-admin/staff");
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  redirect(`/admin/users/${result.user.id}`);
}
