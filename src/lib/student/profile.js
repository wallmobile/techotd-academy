// Profile read function (Phase 8.8). Same pattern as the rest of
// src/lib/student/*: the UI calls this, never src/lib/db/* directly, and
// the identity always comes from getCurrentUser() — there is no userId
// parameter anywhere in this file.
//
// The shape returned here is deliberately the union of only the "safe"
// user fields (getCurrentUser()/findUserById() already never include
// passwordHash) and the student_profiles fields — there is no session
// token, internal id relationship, or database-internal field (created_at
// timestamps aside, which aren't sensitive) anywhere in what this
// returns.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";

export async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return null;

  const profile = await getOrCreateStudentProfile(user.id);

  return { user, profile };
}
