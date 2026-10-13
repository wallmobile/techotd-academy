#!/usr/bin/env node
// Development-only first-admin bootstrap.
//
// Admin roles can never be self-registered: the public /register form always
// creates a STUDENT (src/lib/auth/actions.js) and that is NOT changed here.
// This script is the out-of-band way to create the FIRST SUPER_ADMIN (or
// ADMIN) on a local database. It calls the app's own createUser() /
// hashPassword(), so hashing and storage are identical to normal accounts; it
// never touches existing data and never runs automatically.
//
// Usage:
//   npm run setup:admin -- --name "Your Name" --email you@example.com
//   npm run setup:admin -- --email you@example.com --role ADMIN
//   ADMIN_PASSWORD='...' npm run setup:admin -- --email you@example.com
//
// Password: --password, else the ADMIN_PASSWORD environment variable (keeps it
// out of shell history), else a strong random one is generated and printed
// ONCE. There is no default password. A supplied password is never echoed.
//
// Safety: refuses to run when NODE_ENV=production; refuses to change the role
// of an existing account (no privilege escalation by re-running); an existing
// admin with that email is reused and its password left untouched.

import { register } from "node:module";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

register(new URL("./alias-loader.mjs", import.meta.url));

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcUrl = (relativePath) => pathToFileURL(path.join(PROJECT_ROOT, relativePath)).href;

if (process.env.NODE_ENV === "production") {
  console.error("setup:admin is a local development tool only and refuses to run with NODE_ENV=production.");
  process.exit(1);
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN"];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "";
    args[key] = value;
    if (value) i += 1;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = (args.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Provide a valid --email. Example:\n  npm run setup:admin -- --name "Your Name" --email you@example.com');
    process.exit(1);
  }
  const role = (args.role || "SUPER_ADMIN").toUpperCase();
  if (!ALLOWED_ROLES.includes(role)) {
    console.error(`--role must be one of: ${ALLOWED_ROLES.join(", ")}.`);
    process.exit(1);
  }
  const supplied = args.password || process.env.ADMIN_PASSWORD || "";
  if (supplied && supplied.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  const name = (args.name || "Administrator").trim().slice(0, 100);

  const { findUserByEmailInternal, createUser } = await import(srcUrl("src/lib/db/users.js"));
  const { hashPassword } = await import(srcUrl("src/lib/auth/password.js"));

  const existing = findUserByEmailInternal(email);
  if (existing) {
    if (existing.role !== role) {
      console.error(
        `An account for "${email}" already exists with role ${existing.role}. Refusing to change an existing account's role; use a different email.`
      );
      process.exit(1);
    }
    console.log(`${role} account already exists for ${email} - nothing changed (password untouched).`);
    return;
  }

  const password = supplied || crypto.randomBytes(18).toString("base64url");
  const passwordHash = await hashPassword(password);
  const user = createUser({ name, email, phone: null, passwordHash, role });

  console.log(`Created ${role} account: ${user.email}`);
  console.log("\n--- Local admin login ---");
  console.log("URL:       http://localhost:3000/login   (then redirects to /admin)");
  console.log(`Email:     ${user.email}`);
  if (supplied) {
    console.log("Password:  (the one you provided)");
  } else {
    console.log(`Password:  ${password}`);
    console.log("(Save this now - it is not stored anywhere and will not be shown again.)");
  }
}

main().catch((error) => {
  console.error("setup:admin failed:", error?.message || error);
  process.exit(1);
});
