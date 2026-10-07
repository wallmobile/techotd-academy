// Shared by both src/lib/auth/session.js (which needs next/headers, a
// Server-Component/Server-Action-only API) and src/proxy.js (which runs in
// a separate, lighter execution context and must not import next/headers).
// Kept in its own file with no other imports so both can use it safely.
export const SESSION_COOKIE_NAME = "techotd_session";
