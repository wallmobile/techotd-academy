// Test bootstrap (node --import ./tests/register.mjs --test ...).
// Gives THIS test file its own throw-away PostgreSQL database (never DATABASE_URL
// from the environment, never a developer's data) and registers the resolver hooks.
// TEST_PG_ADMIN_URL points at a server that may create databases; `npm test` supplies
// one (scripts/run-with-pg.mjs starts a temporary cluster, or uses an existing one if
// you set TEST_PG_ADMIN_URL yourself). Databases are named techotd_t_* so they are easy
// to recognise and are dropped by the runner afterwards.
import crypto from "node:crypto";
import { register } from "node:module";
import pg from "pg";

const adminUrl = process.env.TEST_PG_ADMIN_URL;
if (!adminUrl) {
  throw new Error("TEST_PG_ADMIN_URL is not set. Run the tests with `npm test` (it starts a temporary PostgreSQL), or set TEST_PG_ADMIN_URL to a server you can create databases on.");
}

const name = `techotd_t_${crypto.randomBytes(6).toString("hex")}`;
const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
await admin.query(`CREATE DATABASE "${name}"`);
await admin.end();

const url = new URL(adminUrl);
url.pathname = `/${name}`;
process.env.DATABASE_URL = url.toString();
process.env.TECHOTD_TEST_DB_NAME = name;

register(new URL("./loader.mjs", import.meta.url));
