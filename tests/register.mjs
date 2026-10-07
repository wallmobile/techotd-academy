// Test bootstrap (node --import ./tests/register.mjs --test ...).
// Points the app at a throwaway SQLite file BEFORE any app module opens a
// connection (never data/app.db) and registers the resolver hooks.
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { register } from "node:module";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-test-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
process.env.TECHOTD_TEST_DB_DIR = dir;
process.on("exit", () => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
});

register(new URL("./loader.mjs", import.meta.url));
