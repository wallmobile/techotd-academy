# Staging / production deployment guide (PostgreSQL, Vercel-ready)

Scope: deploying TechOTD Academy and proving it works. The data layer is **PostgreSQL**
(`pg`); the app is stateless, so it runs on Vercel (serverless) or on any Node host.
Nothing here has been run against a real Vercel project, a real Neon database, a real
domain or real provider credentials; section 11 states exactly what that leaves unverified.

## 1. What the repository actually assumes

| Topic | Fact (from the code) |
| --- | --- |
| Runtime | Node.js **>= 22.9** (`engines`; the npm scripts use `--env-file-if-exists`). Verified on **24.19.0** only. |
| Process model | Stateless. Works as a long-running `next start` process **or** as serverless functions (Vercel). No local files are written at runtime. |
| Database | **PostgreSQL** via `DATABASE_URL` (verified on PostgreSQL 18). Any PostgreSQL 14+ should work; only 18 was run. No SQLite. |
| Schema | Applied automatically on first use, under a transaction-level advisory lock, and recorded by hash in `schema_meta` (see 6). |
| Connection pool | At most **5** connections **per server instance** (`src/lib/db/client.js`). Serverless platforms run many instances: use your provider's **pooled** connection string. |
| Sessions | DB-backed, `HttpOnly`, `SameSite=Lax`, **`Secure` in production**. |
| Rate limiting / AI limits | Stored in PostgreSQL, so shared by **every instance**. The counter is one atomic statement. |
| Email | Resend over HTTPS (`EMAIL_PROVIDER=resend`). Mock-tested only. |
| AI | Anthropic Messages API (`AI_PROVIDER=anthropic`). Mock-tested only. |
| Payments | **No gateway is integrated.** `PAYMENT_*` variables have no effect. |
| WhatsApp | Boundary only; never sends. |

## 2. Environment variables

Names and meaning only. **Never commit values, and never paste them into chat or tickets.** The
status of each is checked at server start (see 6) and logged by **name**, never value.

| Variable | Needed? | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Set by Vercel and by `next start`. |
| `DATABASE_URL` | **Required** | `postgres://user:password@host/dbname?sslmode=require`. On Vercel use the provider's **pooled** URL (Neon: the host containing `-pooler`). Percent-encode special characters in the password. No default; production refuses to start without it. |
| `NEXT_PUBLIC_SITE_URL` | **Required** | `https://<your-host>` origin only. **Set it at BUILD time and at runtime, to the same value** (on Vercel a project environment variable covers both). Next.js bakes `NEXT_PUBLIC_*` into the build; startup refuses a mismatch. |
| `TRUSTED_PROXY_HOPS` | Set explicitly | Number of reverse proxies in front of the app (default 1). Wrong value weakens login throttling (see 8). |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` | Optional, all three together | Without them: in-app notifications only, and **password reset by email is unavailable**. |
| `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `AI_MODEL` | Optional, all three together | Without them the assistant shows "not available". No default model by design. |
| `AI_MAX_OUTPUT_TOKENS`, `AI_TIMEOUT_MS` | Optional | Numeric, clamped. |
| `CRON_SECRET` | Optional | Enables `POST /api/notifications/process`. Use a long random value (>= 16 chars). |
| `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET` | Leave unset | No gateway exists. |

**First admin.** Admin roles can never be self-registered. Create the first `SUPER_ADMIN` from
your own machine, pointing at the target database (see 5.3). `npm run setup:admin` refuses to run
with `NODE_ENV=production`, so run it from a normal shell, not from the deployed app.

## 3. Deploying on Vercel (step by step)

1. **Database.** Create a PostgreSQL database (Neon, Supabase, Vercel Postgres/Neon integration, or
   any managed PostgreSQL). Copy its **pooled** connection string. Choose the region closest to where
   your Vercel functions will run (Project Settings -> Functions -> Function Region), because every
   page does several queries.
2. **Import the repository** into Vercel (framework: Next.js; the defaults are right: build
   `npm run build`, install `npm ci`). Node.js version: 22.x or 24.x.
3. **Environment variables** (Project Settings -> Environment Variables, Production scope; add the
   same to Preview only if you want previews to work against a *separate* database):
   `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `TRUSTED_PROXY_HOPS=1`, plus the optional integrations.
   Set `NEXT_PUBLIC_SITE_URL` to the final public origin (custom domain if you have one).
4. **Deploy.** The first request creates the schema automatically. Check
   `https://<host>/api/health` -> `{"status":"ok"}`.
5. **Create the first admin** (5.3), sign in at `/login`, change the password at `/admin/account`.
6. **Domain.** Add the custom domain in Vercel, then update `NEXT_PUBLIC_SITE_URL` to it and
   **redeploy** (the value is baked into the build; the startup check refuses a stale build).

Notes specific to Vercel:

* `next build` needs **no database connection**: nothing connects at import time and pages that use data are rendered per request.
* The filesystem is read-only; the app writes nothing to disk.
* Cold starts open a new pool and run one cheap schema-version query. Use the pooled URL so many
  instances cannot exhaust the database's connection limit.
* A connection that died while the function was frozen (or while a serverless database was
  suspended) is detected when it is next used: reads, and transactions whose `BEGIN` never reached
  the server, are retried once on a fresh connection; writes are **not** retried (they might
  already have been applied) and fail visibly instead. A dropped connection never crashes the
  process. (Verified locally by killing connections while the process was blocked; not observed on
  a real Vercel/Neon pair.)
* Scheduled email processing: Vercel Cron only issues `GET` requests, and the endpoint is `POST`
  with an `x-cron-secret` header, so **no cron is configured**. Process the queue from
  `/admin/notifications/deliveries`, or call `POST /api/notifications/process` from an external
  scheduler you control (for example a GitHub Actions schedule) with the secret.

## 4. HTTPS and domain

* Terminate TLS in front of the app (Vercel does this). **Sign-in only works over HTTPS** (or
  `localhost`): session cookies are `Secure`. Startup exits with an explanation if
  `NEXT_PUBLIC_SITE_URL` is plain `http://` for a non-local host.
* The platform must forward the real client address by appending to `X-Forwarded-For`, and pass
  `Host`. Server Actions check `Origin` against `Host`: the proxy must not rewrite `Host`.
* HSTS, CSP and the other security headers are emitted by the app on every response.
* **Staging must not be indexed.** `robots.txt` allows public pages. Protect staging with Vercel
  deployment protection / basic auth / an `X-Robots-Tag: noindex` header at the edge. Not handled in code.

## 5. Running it yourself (any Node host) and local development

### 5.1 Local development

You need a PostgreSQL server. Options: install PostgreSQL locally, or create a free hosted
database and use its URL. Then:

```bash
cp .env.example .env.local        # set DATABASE_URL (a LOCAL or throw-away database)
npm ci
npm run dev
```

Use a database you do not mind losing. **Never point development at the production database.**

### 5.2 Build and start on your own host

```bash
node -v                                   # >= 22.9
npm ci
export NEXT_PUBLIC_SITE_URL="https://staging.example.org"   # build-time AND runtime
export DATABASE_URL="postgres://user:password@host:5432/dbname?sslmode=require"
export TRUSTED_PROXY_HOPS=1
npm run build
npm start -- -H 127.0.0.1 -p 3000          # logs [config] warnings; exits 1 on a dangerous setting
```

### 5.3 Creating the first admin / a trainer against a database

```bash
# from your machine; the password is read from the environment so it stays out of shell history
DATABASE_URL="<the target database URL>" ADMIN_PASSWORD='<choose one>' \
  npm run setup:admin -- --name "Your Name" --email you@example.org
```

Omit `ADMIN_PASSWORD` to have a strong random one generated and printed once. The script never
prints the connection string, refuses to change an existing account's role, and only ever inserts.
`npm run setup:trainer -- --email ... --batch <id>` works the same way. Both read `.env.local`
if present.

## 6. Schema and migrations

The schema (`src/lib/db/schema.js`) is applied automatically by the first process that touches
the database. It is **additive and repeatable** (`CREATE ... IF NOT EXISTS`) and runs as one
transaction under `pg_advisory_xact_lock`, so many instances starting at once serialise safely
(verified with 13 simultaneous processes). A SHA-256 of the schema text is stored in `schema_meta`;
an up-to-date database costs one small query per cold start. There is no separate migration
command and no down-migration.

Procedure for any deploy that changes the schema:

1. Take a backup first (section 8).
2. Deploy; check `GET /api/health` returns `{"status":"ok"}`.
3. Never run an untested build against the production database; rehearse on a restored copy.

Changing an existing column or dropping something is **not** done by this mechanism; that would
need an explicit, reviewed migration. Future schema edits must keep to additive statements
(`ADD COLUMN IF NOT EXISTS`, new tables, new indexes).

Startup validation (`src/instrumentation.js`) logs, by name only: missing/half-configured
integrations (warnings) and dangerous settings (errors -> exit code 1).

## 7. Health, logs, monitoring

* `GET /api/health` -> `200 {"status":"ok"}` after a real database round trip and a schema check;
  `503 {"status":"unavailable"}` otherwise. No detail is exposed.
* Logs go to stdout/stderr (Vercel: Runtime Logs). Config warnings are prefixed `[config]`; failed
  email sends log a short code only. **No alerting is configured by the application.**

## 8. Backups and restore

On a managed PostgreSQL service, **the provider's backups / point-in-time recovery are the primary
safety net**: turn them on, check the retention window, and do a restore drill in the provider's
console. The repository adds a portable extra copy:

```bash
npm run backup                                  # pg_dump -> data/backups/app-<UTC time>.dump
npm run backup -- /safe/place/app-2026-01-01.dump
npm run backup:verify -- <file>                 # pg_restore --list + required tables present
```

Both need the PostgreSQL client tools (`pg_dump`, `pg_restore`) on `PATH`. The password reaches
`pg_dump` through its environment, never the command line, and is never printed. A backup never
overwrites a file. (Verified: a backup taken while another process was writing restored into a
separate database with the same data; corrupt, truncated and incomplete archives are rejected.)

Restore drill (always into a **scratch** database first):

1. Create an empty database.
2. `pg_restore --no-owner --dbname=<scratch url> <file>`
3. Point a non-production deployment (or `npm run dev`) at it; check `/api/health`, sign in, spot-check a recent record.

You must still decide and implement: **where backups are stored (off-host), how often they run,
retention, and who is alerted when one fails.** None of that is in the repo.

## 9. Smoke tests after every deploy

```bash
curl -fsS https://staging.example.org/api/health                      # {"status":"ok"}
curl -sI https://staging.example.org/ | grep -iE "strict-transport|content-security|x-frame"
curl -s https://staging.example.org/robots.txt | grep -i sitemap      # staging origin, not production
curl -s https://staging.example.org/sitemap.xml | head -c 300         # staging origin only
```

Then, in a browser: sign in as each role; open `/courses`, a course page, `/batches`; submit an
enquiry (a lead appears under `/admin/leads`); create a draft course, publish, confirm it is public,
unpublish, confirm 404; change your own password at `/admin/account`.

## 10. Concurrency model (what changed with PostgreSQL)

SQLite ran every request one at a time inside a single process; PostgreSQL does not. The code was
reviewed for that:

* Every multi-row write (fees and payments, certificates, enrollments, placement, catalog edits,
  lead conversion, password reset, bulk attendance) runs in **one transaction** (`db.tx`), which also
  retries on deadlock/serialization failures.
* Where two requests must not interleave (a payment against one fee plan, issuing a certificate for
  one student+course, enrolling one student, converting one lead, the last Super Admin) the code
  takes a **row lock** (`SELECT ... FOR UPDATE`) or a **transaction-scoped advisory lock**.
* The rate limiter is a single atomic `INSERT ... ON CONFLICT DO UPDATE`.
* Uniqueness races (same e-mail registering twice, same catalog slug) are decided by UNIQUE
  constraints and reported as the normal "already exists" message.
* Known soft spots, accepted: the per-user AI daily cap is count-then-record (two simultaneous calls
  can both pass at the limit by one), and archiving a batch checks for active enrollments just
  before writing (an enrollment created in that instant is not blocked).

## 11. Verification status

**Verified automatically** (repository tests against a real PostgreSQL 18, real Chrome, production
build, isolated databases): login/logout, session expiry and revocation, password reset flow (mock
email), staff password change, role authorization on every admin route, CSRF (foreign-origin action
rejected), rate limiting incl. forged `X-Forwarded-For` and concurrent consumption, CSP/HSTS/security
headers, CSV/PDF access control, public course/batch visibility, secret non-disclosure, `/api/health`,
fail-fast configuration, build-time/runtime site-URL mismatch detection, database constraints (FK,
CHECK, UNIQUE, RESTRICT, one active certificate per student+course), schema initialisation under
13 simultaneous processes, six processes writing concurrently with exact totals, concurrent
payments/enrollments/certificates/lead conversion, backup taken during writes -> verify -> restore.

**Blocked by missing credentials / infrastructure** (nothing here was run against the real thing):
a real Vercel deployment; a real Neon (or other managed) database, its pooled connection string and
TLS; behaviour after a serverless database suspends and resumes; real Resend send/delivery/bounce;
real Anthropic success/failure/timeout; the proxy header chain on the actual host
(`TRUSTED_PROXY_HOPS=1` is an assumption for Vercel); real domain and cookie behaviour over HTTPS;
provider backup/PITR restore drill; log shipping and alerting.

**Not tested:** load/performance (including per-page query counts against a remote database);
browsers other than Chromium; penetration testing; accessibility audit.

### Provider checks to run on staging (needs credentials and your authorisation)

Email (Resend): set `EMAIL_PROVIDER`, `RESEND_API_KEY` (a restricted staging key), `EMAIL_FROM` (a
verified sender) and `NEXT_PUBLIC_SITE_URL`; redeploy; confirm no `[config]` email warning. Enrol a
test student whose mailbox you control; `/admin/notifications/deliveries` should show `SENT` and the
message should arrive. Failure path: temporarily set a wrong key, repeat, expect `FAILED http_401`.
Password reset: request one for the test student; the link must carry the staging origin.

AI (Anthropic): set `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `AI_MODEL`; sign in as the test student; ask
a question on `/student/assistant`; expect an answer and one `ai_usage` row. Failure path: a wrong
key -> "couldn't answer right now". Confirm the key appears in no page source, bundle or log.

## 12. Rollback

Schema changes are additive, so older code can open a newer database. But data created by newer
features is not understood by older code (admin-created courses/batches and unpublished/closed
states disappear; code-defined courses all look published again; enrollments in admin-created
batches show as "Unknown course"). Therefore:

1. If the deploy only changed code and no admin content was created yet: redeploy the previous build
   (Vercel: promote the previous deployment; it keeps its own baked `NEXT_PUBLIC_SITE_URL`).
2. Otherwise prefer **roll forward**; if you must roll back, restore the pre-deploy backup (section 8),
   accepting the loss of everything written since.
3. Always take a backup before deploying.

## 13. Known limits to keep in mind

* CSP keeps `'unsafe-inline'` for scripts and styles (Next.js inline bootstrap, static policy).
* `npm audit` (all dependencies) may list dev-only findings in the lint toolchain; they are not
  installed with `--omit=dev`.
* Pages issue several small queries; against a database in a *different region* than the functions
  this is noticeably slower. Keep them together.
* No self-service password change page for trainers; no per-user email unsubscribe link in emails.
