#!/usr/bin/env node
// Development-only Trainer account creator.
//
// Trainer accounts cannot be self-registered (the public /register form
// always creates a STUDENT — see src/lib/auth/actions.js), which is
// correct and is NOT changed by this script. This is the "clean existing
// architecture" way to get a local Trainer account for testing: it calls
// the exact same createUser()/hashPassword()/createTrainerBatchAssignment()
// functions the real application uses (via the "@/" alias, resolved by
// scripts/alias-loader.mjs) — no raw SQL, no parallel/duplicate logic,
// and it never runs automatically (only via `npm run setup:trainer`).
//
// Usage:
//   npm run setup:trainer -- --name "Asha Kulkarni" --email trainer@example.com --batch full-stack-development-01
//   npm run setup:trainer -- --email trainer@example.com --password "SomeStrongPassword123!"
//   npm run setup:trainer -- --list-batches
//
// Password sources, in order: --password, the TRAINER_PASSWORD environment
// variable (keeps it out of shell history / process listings), or — if
// neither is given — a strong random password generated and printed ONCE.
// A password you supply is never echoed back; none is ever stored in the
// repo or hard-coded. Passwords are hashed with the app's own bcryptjs
// hashPassword() and must be at least 8 characters.
// Re-running for an existing TRAINER email reuses the account (password
// untouched) and only adds the batch assignment; the
// UNIQUE(trainer_user_id, batch_id) constraint makes a duplicate
// assignment a harmless no-op.
// If --batch is omitted, the trainer is created without a batch
// assignment; re-run with --batch to assign one, or run --list-batches
// to see the available batch ids.

import { register } from "node:module";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

register(new URL("./alias-loader.mjs", import.meta.url));

// Resolved against the project root (this script's own parent directory),
// not process.cwd(), so `npm run setup:trainer` works the same way
// regardless of where it's invoked from. fileURLToPath (rather than
// url.pathname) handles Windows drive-letter paths correctly.
const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function srcUrl(relativePath) {
  return pathToFileURL(path.join(PROJECT_ROOT, relativePath)).href;
}

if (process.env.NODE_ENV === "production") {
  console.error(
    "setup:trainer is a local development tool only and refuses to run with NODE_ENV=production."
  );
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    if (key === "list-batches") {
      args.listBatches = true;
      continue;
    }
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "";
    args[key] = value;
    if (value) i += 1;
  }
  return args;
}

function generatePassword() {
  // 18 random bytes, base64url-encoded — well above typical strength
  // requirements, unique per run, never predictable/hard-coded.
  return crypto.randomBytes(18).toString("base64url");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const { batches } = await import(srcUrl("src/data/batches.js"));

  if (args.listBatches) {
    console.log("Available batch ids:");
    for (const batch of batches) {
      console.log(`  - ${batch.id}  (${batch.courseSlug}, ${batch.mode})`);
    }
    return;
  }

  const email = (args.email || "").trim().toLowerCase();
  if (!email) {
    console.error(
      'Missing --email. Example:\n  npm run setup:trainer -- --name "Asha Kulkarni" --email trainer@example.com --batch full-stack-development-01'
    );
    process.exit(1);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`"${email}" is not a valid email address.`);
    process.exit(1);
  }

  const suppliedPassword = args.password || process.env.TRAINER_PASSWORD || "";
  if (suppliedPassword && suppliedPassword.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const name = (args.name || email.split("@")[0]).trim();
  const batchId = args.batch ? args.batch.trim() : null;

  if (batchId && !batches.some((b) => b.id === batchId)) {
    console.error(`Unknown batch id "${batchId}". Run with --list-batches to see valid ids.`);
    process.exit(1);
  }

  const { findUserByEmailInternal, createUser } = await import(
    srcUrl("src/lib/db/users.js")
  );
  const { hashPassword } = await import(srcUrl("src/lib/auth/password.js"));
  const { createTrainerBatchAssignment, isBatchAssignedToTrainer } = await import(
    srcUrl("src/lib/db/trainerBatchAssignments.js")
  );

  const existing = findUserByEmailInternal(email);
  let trainer;
  let generatedPassword = null;

  if (existing) {
    if (existing.role !== "TRAINER") {
      console.error(
        `A user with email "${email}" already exists with role ${existing.role}, not TRAINER. Refusing to change an existing account's role.`
      );
      process.exit(1);
    }
    trainer = existing;
    console.log(`Trainer account already exists for ${email} — reusing it.`);
  } else {
    const password = suppliedPassword || generatePassword();
    if (!suppliedPassword) generatedPassword = password;
    const passwordHash = await hashPassword(password);
    trainer = createUser({ name, email, phone: null, passwordHash, role: "TRAINER" });
    console.log(`Created TRAINER account: ${trainer.email} (id: ${trainer.id})`);
  }

  if (batchId) {
    const alreadyAssigned = isBatchAssignedToTrainer(trainer.id, batchId);
    createTrainerBatchAssignment(trainer.id, batchId);
    console.log(
      alreadyAssigned
        ? `Batch "${batchId}" was already assigned to ${trainer.email} — nothing changed.`
        : `Assigned batch "${batchId}" to ${trainer.email}.`
    );
  } else {
    console.log(
      "No --batch given — trainer created without a batch assignment. Re-run with --batch <batch-id> (see --list-batches) to assign one."
    );
  }

  console.log("\n--- Local Trainer login ---");
  console.log(`Email:    ${trainer.email}`);
  if (generatedPassword) {
    console.log(`Password: ${generatedPassword}`);
    console.log("(Save this now — it is not stored anywhere and will not be shown again.)");
  } else {
    console.log("Password: (unchanged — the one you provided, or the account's existing one)");
  }
}

main().catch((error) => {
  console.error("setup:trainer failed:", error);
  process.exit(1);
});
