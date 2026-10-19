// Seeds an ISOLATED e2e database (DATABASE_URL must point at a throwaway file).
//   node e2e/seed.mjs <out.json> [bulk]
import fs from "node:fs";
import { register } from "node:module";

// Only the alias loader: tests/register.mjs would swap DATABASE_URL for its own DB.
register(new URL("../tests/loader.mjs", import.meta.url));
const { createUser } = await import("@/lib/db/users");
const { hashPassword } = await import("@/lib/auth/password");
const { createTrainerBatchAssignment } = await import("@/lib/db/trainerBatchAssignments");
const { batches } = await import("@/data/batches");

if (!/e2e/i.test(process.env.DATABASE_URL || "")) {
  throw new Error("Refusing to seed: DATABASE_URL must be an e2e-specific database");
}
const PASSWORD = "E2e-Passw0rd-Test";
const hash = await hashPassword(PASSWORD);
const out = { password: PASSWORD, users: {}, batch: batches[0].id, course: batches[0].courseSlug };

const roles = {
  student: "STUDENT",
  student2: "STUDENT",
  trainer: "TRAINER",
  trainer2: "TRAINER",
  admin: "ADMIN",
  superadmin: "SUPER_ADMIN",
  counsellor: "COUNSELLOR",
  accountant: "ACCOUNTANT",
  placement: "PLACEMENT_MANAGER",
  contentmgr: "CONTENT_MANAGER",
};
for (const [key, role] of Object.entries(roles)) {
  const u = createUser({ name: `E2E ${key}`, email: `${key}@e2e.test`, phone: null, passwordHash: hash, role });
  out.users[key] = { id: u.id, email: u.email, role };
}
createTrainerBatchAssignment(out.users.trainer.id, batches[0].id);

// Bulk synthetic data (no real people) so pagination, search and empty states
// can be exercised: 25 extra students and 25 extra leads.
const { createLead } = await import("@/lib/db/leads");
const bulk = process.argv[3] === "bulk";
for (let i = 1; bulk && i <= 25; i += 1) {
  const n = String(i).padStart(2, "0");
  createUser({ name: `Bulk Student ${n}`, email: `bulk${n}@e2e.test`, phone: null, passwordHash: hash, role: "STUDENT" });
  createLead({ name: `Bulk Lead ${n}`, phone: "9000000000", email: `bulklead${n}@e2e.test`, source: i % 2 ? "ENQUIRY" : "BOOK_DEMO", courseSlug: batches[0].courseSlug, consent: true });
}
out.bulk = bulk ? { students: 25, leads: 25 } : null;
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
