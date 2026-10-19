"use server";

// Staff account Server Actions. The user is always the signed-in session user;
// the form only supplies the three password fields, which are never echoed
// back in the returned state.

import { changeStaffPassword } from "@/lib/auth/changePassword";

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function changeStaffPasswordAction(_prev, formData) {
  const result = await changeStaffPassword({
    currentPassword: field(formData, "currentPassword"),
    password: field(formData, "password"),
    confirmPassword: field(formData, "confirmPassword"),
  });
  if (!result.ok) return { status: "error", errors: result.errors ?? {}, formError: result.errors ? null : result.message };
  return { status: "success", message: "Your password has been changed. You've been signed out of all other devices." };
}
