import { getUserFromSessionCookie } from "@/lib/auth/session";

// The one server-side helper the rest of the app should call to find out
// who's signed in. Always returns a safe, minimal shape — never the
// password hash or any other secret — or null when there's no valid
// session.
export async function getCurrentUser() {
  const user = await getUserFromSessionCookie();
  if (!user) return null;

  // Accounts that are INACTIVE/SUSPENDED after the session was issued must
  // not keep acting as signed in (spec section 6).
  if (user.status !== "ACTIVE") return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}
