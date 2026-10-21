// Tiny test-only convenience over the real async db API, so assertions can read
// the database directly: `(await tdb.prepare(sql).get(a, b)).c`. Each call is
// async - always await it. Not used by application code.
import { db } from "@/lib/db/client";

const params = (args) => (args.length === 1 && (Array.isArray(args[0]) || (args[0] && typeof args[0] === "object")) ? args[0] : args);

export const tdb = {
  prepare(sql) {
    return {
      get: (...args) => db.get(sql, params(args)),
      all: (...args) => db.all(sql, params(args)),
      run: (...args) => db.run(sql, params(args)),
    };
  },
  exec: (sql) => db.exec(sql),
};

// Failure injection for atomicity tests: while installed, inserting an audit_log
// row for `action` raises an error, so the surrounding transaction must roll back.
export async function failAuditInsert(name, action) {
  await db.exec(`CREATE FUNCTION ${name}_fn() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.action = '${action}' THEN RAISE EXCEPTION 'simulated failure'; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER ${name} BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION ${name}_fn();`);
}

export async function removeAuditFailure(name) {
  await db.exec(`DROP TRIGGER IF EXISTS ${name} ON audit_log; DROP FUNCTION IF EXISTS ${name}_fn();`);
}
