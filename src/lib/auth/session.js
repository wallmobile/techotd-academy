import { cookies } from "next/headers";
import {
  createSession,
  deleteSessionByToken,
  getUserBySessionToken,
  isRememberedSessionToken,
} from "@/lib/db/sessions";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export { SESSION_COOKIE_NAME };

function cookieOptions({ remember, maxAgeSeconds }) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Only a "remembered" login gets a persistent cookie (maxAge). An
    // unchecked "Remember me" still gets a real, shorter-lived server-side
    // session, but as a session cookie that clears when the browser closes.
    ...(remember ? { maxAge: maxAgeSeconds } : {}),
  };
}

// Creates a DB-backed session for userId and writes its opaque token to an
// HTTP-only cookie. Must be called from a Server Action or Route Handler
// (Next.js only allows setting cookies there, not during rendering).
export async function startSession(userId, { remember = false } = {}) {
  const { token, maxAgeSeconds } = await createSession(userId, { remember });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions({ remember, maxAgeSeconds }));
}

// Invalidates the session server-side (so logout is real, not just a
// client-side flag) and clears the cookie.
export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  await deleteSessionByToken(token);
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Reads the session cookie (if any) and resolves it to a user. Safe to
// call from Server Components — read-only, does not mutate cookies.
export async function getUserFromSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return await getUserBySessionToken(token);
}

// Whether the CURRENT browser's session was a "remembered" (persistent)
// login. Read-only — used by changePasswordAction to carry the same
// remember behavior into the fresh session it starts, rather than always
// downgrading to a browser-session cookie.
export async function isCurrentSessionRemembered() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return await isRememberedSessionToken(token);
}
