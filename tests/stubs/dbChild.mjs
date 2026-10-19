// Child process used by tests/deployment.test.mjs to exercise the REAL database
// client from separate OS processes (true concurrency, not shared memory).
//   node tests/stubs/dbChild.mjs <mode> [args]    with DATABASE_URL set
import { register } from "node:module";

register(new URL("../loader.mjs", import.meta.url));

const [mode, ...args] = process.argv.slice(2);
const { db } = await import("@/lib/db/client");

if (mode === "writes") {
  // N audit inserts + N atomic counter increments through the app's own code.
  const { writeAudit } = await import("@/lib/db/audit");
  const { consumeRateLimit } = await import("@/lib/db/rateLimits");
  const n = Number(args[0]);
  for (let i = 0; i < n; i += 1) {
    writeAudit(null, "load.test", "load", `p${process.pid}-${i}`, { i });
    consumeRateLimit("shared-counter", { limit: 1_000_000, windowSeconds: 3600 });
  }
} else if (mode === "seed") {
  const { createUser } = await import("@/lib/db/users");
  const { writeAudit } = await import("@/lib/db/audit");
  const n = Number(args[0]);
  for (let i = 0; i < n; i += 1) {
    const u = createUser({ name: `Seed ${i}`, email: `seed${i}@example.test`, phone: null, passwordHash: "x", role: "STUDENT" });
    writeAudit(u.id, "seed.created", "user", u.id);
  }
} else if (mode === "counts") {
  const one = (sql) => db.prepare(sql).get().c;
  console.log(
    JSON.stringify({
      users: one("SELECT COUNT(*) c FROM users"),
      audit: one("SELECT COUNT(*) c FROM audit_log"),
      load: one("SELECT COUNT(*) c FROM audit_log WHERE action = 'load.test'"),
      shared: db.prepare("SELECT SUM(count) c FROM rate_limits WHERE key LIKE 'shared-counter%'").get().c,
      integrity: db.pragma("integrity_check", { simple: true }),
      fk: db.pragma("foreign_key_check").length,
    })
  );
}
process.exit(0);
