"use server";

// Server Actions for the student profile page (Phase 8.8): editing
// profile fields, and changing password. Both re-derive the user from the
// session — neither ever accepts a userId/studentId from the form.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile, updateStudentProfileFields } from "@/lib/db/studentProfiles";
import { updateUserName, updateUserPasswordHash, findUserByIdInternal } from "@/lib/db/users";
import { deleteAllSessionsForUser } from "@/lib/db/sessions";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { startSession, isCurrentSessionRemembered } from "@/lib/auth/session";
import { validateProfileForm } from "@/lib/validateProfile";
import { validateChangePasswordForm } from "@/lib/validateAuth";

function fieldValues(formData, fields) {
  return Object.fromEntries(fields.map((field) => [field, formData.get(field) ?? ""]));
}

// --- Edit profile -----------------------------------------------------
//
// Only name (users table) and phone/city/bio (student_profiles table) are
// ever written here. There is no field in this form for role, status,
// id, or email — not "ignored if sent", genuinely never read from
// formData at all, so there's nothing a crafted request could smuggle in
// to change them.
export async function updateProfileAction(_prevState, formData) {
  const values = fieldValues(formData, ["name", "phone", "city", "bio"]);

  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return {
      status: "error",
      errors: {},
      formError: "You need to be signed in as a student to update your profile.",
      values,
    };
  }

  const errors = validateProfileForm(values);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values };
  }

  updateUserName(user.id, values.name);
  const profile = getOrCreateStudentProfile(user.id);
  updateStudentProfileFields(profile.id, {
    phone: values.phone.trim(),
    city: values.city.trim(),
    avatarUrl: profile.avatarUrl,
    bio: values.bio.trim(),
  });

  return { status: "success", message: "Your profile has been updated.", values };
}

// --- Change password ----------------------------------------------------
//
// Requires the CURRENT password (not just an active session) before
// accepting a new one. On success, every existing session for this user
// is invalidated (spec: "Invalidate existing sessions if appropriate") —
// including this one — and a brand-new session is started immediately so
// the browser that just made the change stays signed in; every other
// signed-in device is effectively signed out.
export async function changePasswordAction(_prevState, formData) {
  const values = fieldValues(formData, ["currentPassword", "password", "confirmPassword"]);

  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return {
      status: "error",
      errors: {},
      formError: "You need to be signed in as a student to change your password.",
    };
  }

  const errors = validateChangePasswordForm(values);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  const internalUser = findUserByIdInternal(user.id);
  const currentPasswordMatches = await verifyPassword(values.currentPassword, internalUser.passwordHash);
  if (!currentPasswordMatches) {
    return {
      status: "error",
      errors: { currentPassword: "That current password is incorrect." },
    };
  }

  const passwordHash = await hashPassword(values.password);
  updateUserPasswordHash(user.id, passwordHash);

  // Read before deleting — otherwise the session row this decision depends
  // on is already gone. Carries the browser's original "remember me" choice
  // into the fresh session, instead of always silently downgrading a
  // persistent login to a browser-session cookie.
  const remember = await isCurrentSessionRemembered();
  deleteAllSessionsForUser(user.id);
  await startSession(user.id, { remember });

  return {
    status: "success",
    message: "Your password has been changed. You've been signed out of any other devices.",
  };
}
