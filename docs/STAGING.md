# Staging deployment guide

Scope: deploying TechOTD Academy to a **staging** environment and proving it works.
Nothing here has been run against a real staging host, a real domain or real provider
credentials; section 10 states exactly what that leaves unverified.

## 1. What the repository actually assumes

| Topic | Fact (from the code) |
| --- | --- |
| Runtime | Node.js **>= 22** (`engines`; `better-sqlite3` 13 requires it). Verified on **24.19.0** only. |
| Process model | One long-running `next start` Node process. No serverless / edge assumptions. |
| Database | **SQLite file** (`better-sqlite3`, WAL mode). **One host, one file.** Not safe on network filesystems; not shareable between hosts. |
| Hosting | None assumed. Any host that can run Node, keep a persistent disk and terminate HTTPS in front of it. |
| Sessions | DB-backed, `HttpOnly`, `SameSite=Lax`, **`Secure` in production** (see 3). |
| Rate limiting / AI limits | Stored in the same SQLite file, so shared by every process **on that file**. |
| Email | Resend over HTTPS (`EMAIL_PROVIDER=resend`). Mock-tested only. |
| AI | Anthropic Messages API (`AI_PROVIDER=anthropic`). Mock-tested only. |
| Payments | **No gateway is integrated.** `PAYMENT_*` variables have no effect. |
| WhatsApp | Boundary only; never sends. |

## 2. Environment variables

Names and meaning only. Never commit values. The status of each is checked at server start
(see 6) and logged by **name**, never value.

| Variable | Needed? | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` for `next start` | Set by `next start`; do not run staging in dev mode. |
| `NEXT_PUBLIC_SITE_URL` | **Required** | `https://<staging-host>` origin only. **Set it at BUILD time and at runtime, to the same value.** Next.js bakes `NEXT_PUBLIC_*` into the build; startup refuses a mismatch. |
| `DATABASE_URL` | Strongly recommended | `file:/absolute/path/app.db` on persistent storage. Unset = `./data/app.db` under the working directory. Other schemes (`postgres://`...) are rejected at startup. |
| `TRUSTED_PROXY_HOPS` | Set explicitly | Number of reverse proxies you operate (default 1). `0` if the app is directly exposed. Wrong value weakens login throttling (see 8). |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` | Optional, all three together | Without them: in-app notifications only, and **password reset by email is unavailable**. |
| `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `AI_MODEL` | Optional, all three together | Without them the assistant shows "not available". No default model by design. |
| `AI_MAX_OUTPUT_TOKENS`, `AI_TIMEOUT_MS` | Optional | Numeric, clamped. |
| `CRON_SECRET` | Optional | Enables `POST /api/notifications/process`. Use a long random value (>= 16 chars). |
| `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET` | Leave unset | No gateway exists. |

First admin (development / bootstrap): `npm run setup:admin` refuses `NODE_ENV=production`. In
staging create the first `SUPER_ADMIN` by running it once against the staging database with
`NODE_ENV` unset, then sign in and rotate the password at `/admin/account`.

## 3. HTTPS and domain

* Terminate TLS in front of the app (reverse proxy / load balancer). The app does not serve HTTPS.
* **Sign-in only works over HTTPS** (or `localhost`): session cookies are `Secure`. Startup exits
  with an explanation if `NEXT_PUBLIC_SITE_URL` is plain `http://` for a non-local host.
* The proxy must forward the real client address by appending to `X-Forwarded-For`, and pass `Host`.
* Server Actions check `Origin` against `Host`: the proxy must not rewrite `Host`.
* HSTS, CSP and the other security headers are emitted by the app on every response.
* **Staging must not be indexed.** `robots.txt` allows public pages. Add `X-Robots-Tag: noindex` (or
  HTTP basic auth / IP allow-list) at the proxy for staging. Not handled in code.
* Bind `next start` to loopback (`-H 127.0.0.1`) when the proxy runs on the same host.

## 4. Build and start

```bash
node -v                                  # >= 22
npm ci                                   # lockfile install; add --omit=dev on a runtime-only host
export NEXT_PUBLIC_SITE_URL="https://staging.example.org"   # build-time AND runtime
export DATABASE_URL="file:/var/lib/techotd/app.db"
export TRUSTED_PROXY_HOPS=1
npm run build
npm start -- -H 127.0.0.1 -p 3000        # logs [config] warnings; exits 1 on a dangerous setting
```

`next build` opens the database (it prerenders and imports data modules). Point `DATABASE_URL`
at a **scratch** file for the build step if the build host must not touch the real database, then
use the real URL at runtime.

## 5. Persistent storage and permissions

* The database directory must be writable by the service user and **persistent across deploys**.
  Do not keep it inside a directory that a deploy replaces.
* Restrict access: directory `0700`, files `0600`, owned by the service account (`umask 077` in the
  service definition). SQLite also writes `app.db-wal` and `app.db-shm` next to the file; they carry
  data and need the same protection and the same backups.
* One application process per database file. Do not run two instances on two hosts with two files
  (they would diverge). Several processes on the **same** file are safe (verified, section 9).

## 6. Migrations

Schema changes are applied automatically when the first process opens the database. They are
**additive and repeatable** (`CREATE ... IF NOT EXISTS`, `ADD COLUMN` if missing) and run as one
IMMEDIATE transaction: either everything applies or nothing does. There is no separate migration
command and no down-migration.

Procedure for any deploy that changes the schema:

1. `npm run backup` (and `npm run backup:verify -- <file>`) **before** starting the new version.
2. Start the new version; check `GET /api/health` returns `{"status":"ok"}`.
3. Never run an untested build against the production database; rehearse on a restored copy.

Startup validation (`src/instrumentation.js`) logs, by name only: missing/half-configured
integrations (warnings) and dangerous settings (errors -> exit code 1).

## 7. Health, logs, monitoring

* Health check: `GET /api/health` -> `200 {"status":"ok"}` after a real database round trip and a
  schema check; `503 {"status":"unavailable"}` otherwise. No detail is exposed. Use it for the load
  balancer and uptime monitor.
* Logs go to stdout/stderr. Config warnings are prefixed `[config]`; failed email sends log a short
  code only; no stack traces or database errors appear during normal traffic (tested). Ship them to
  whatever log store the host provides. **No alerting is configured by the application.**
* Scheduled work: if email is configured, call `POST /api/notifications/process` with header
  `x-cron-secret: <CRON_SECRET>` every few minutes (retries/backoff are processed there), or use
  `/admin/notifications/deliveries`.

## 8. Backups and restore

Create: `npm run backup` -> `data/backups/app-<UTC time>.db` under the working directory (SQLite
online-backup API; safe while the app is running; verified with a concurrent writer). Give an absolute
destination (`npm run backup -- /backups/app-2026-01-01.db`) so backups do not sit next to the database
on the same disk. It never overwrites a file.

Verify: `npm run backup:verify -- <file>` -> integrity check, foreign-key check, every schema table
present, row **counts** only. Exit 0 = usable.

Restore (the verified procedure, into a scratch location first):

1. Stop the app.
2. Move the current `app.db`, `app.db-wal`, `app.db-shm` aside (**remove stale -wal/-shm**: a leftover
   WAL from the old file must not be applied to the restored one).
3. Copy the backup to the `DATABASE_URL` path.
4. `npm run backup:verify -- <that path>`.
5. Start the app; `GET /api/health`; sign in; spot-check a recent record.

You must still decide and implement: **where backups are stored (off-host), how often they run
(cron / scheduler), retention, and who is alerted when one fails.** None of that is in the repo.

## 9. Smoke tests after every deploy

```bash
curl -fsS https://staging.example.org/api/health                      # {"status":"ok"}
curl -sI https://staging.example.org/ | grep -iE "strict-transport|content-security|x-frame"
curl -s https://staging.example.org/robots.txt | grep -i sitemap      # staging origin, not production
curl -s https://staging.example.org/sitemap.xml | head -c 300         # staging origin only
```

Then, in a browser: sign in as each role; open `/courses`, a course page, `/batches`; submit an
enquiry (a lead appears under `/admin/leads`); create a draft course, publish, confirm it is public,
unpublish, confirm 404; change your own password at `/admin/account`; `npm run backup` and
`npm run backup:verify`.

## 10. Verification status

**Verified automatically** (repository tests, real Chrome, production build, isolated databases):
login/logout, session expiry and revocation, password reset flow (mock email), staff password
change, role authorization on every admin route (8 roles x 37 routes), CSRF (foreign-origin action
rejected), rate limiting incl. forged `X-Forwarded-For`, CSP/HSTS/security headers on every response
type, CSV/PDF access control, public course/batch visibility, secret non-disclosure (server logs,
HTML, every served JS/CSS bundle, network responses), `/api/health`, fail-fast configuration,
build-time/runtime site-URL mismatch detection, database constraints (FK, CHECK, UNIQUE, RESTRICT),
atomic schema initialisation, six concurrent processes writing one database, backup taken during
writes -> verify -> restore into a separate database, rejection of corrupt/truncated backups,
migration on a copy of the existing development database.

**Verified manually** (this phase): `NEXT_PUBLIC_SITE_URL` is baked in at build time (build A / run B
-> the A origin wins in sitemap, canonical URLs and robots, and startup refuses the mismatch);
unset at build time -> the runtime value is used. `npm audit --omit=dev`: 0 vulnerabilities after
upgrading Next.js 16.3.6 -> 16.3.8.

**Blocked by missing credentials / infrastructure** (nothing here was run against the real thing):
real Resend send, delivery, bounce and timeout behaviour; real Anthropic success/failure/timeout
behaviour; TLS termination and the proxy header chain on the actual host; real domain and cookie
behaviour over HTTPS; backup storage, schedule, retention and restore drill on the actual host;
log shipping and alerting.

**Not tested:** load/performance; browsers other than Chromium; multi-instance deployment (not
supported with SQLite); penetration testing; accessibility audit.

### Provider checks to run on staging (needs credentials and your authorisation)

Email (Resend): set `EMAIL_PROVIDER`, `RESEND_API_KEY` (a restricted staging key), `EMAIL_FROM` (a
verified sender) and `NEXT_PUBLIC_SITE_URL`; restart; confirm no `[config]` email warning. Enrol a test
student whose mailbox you control; `/admin/notifications/deliveries` should show `SENT` and the
message should arrive. Failure path: temporarily set a wrong key, repeat, expect `FAILED http_401`
(no retry storm, no provider body stored). Password reset: request one for the test student; the link
must carry the staging origin.

AI (Anthropic): set `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `AI_MODEL`; sign in as the test student; ask
a question on `/student/assistant`; expect an answer and one `ai_usage` row. Failure path: a wrong
key -> "couldn't answer right now". Confirm the key appears in no page source, bundle or log.

## 11. Rollback

Schema changes are additive, so older code can open a newer database. But data created by newer
features is not understood by older code: after a rollback, admin-created courses/batches and
unpublished/closed states disappear (code-defined courses all look published again), and enrollments
in admin-created batches show as "Unknown course". Therefore:

1. If the deploy only changed code and no admin content was created yet: redeploy the previous
   build (build it with the same `NEXT_PUBLIC_SITE_URL`).
2. Otherwise prefer **roll forward**; if you must roll back, restore the pre-deploy backup (section 8),
   accepting the loss of everything written since.
3. Always take and verify a backup before deploying.

## 12. Known limits to keep in mind

* SQLite means one host; rate limits protect that host only (add proxy/WAF limits for more).
* CSP keeps `'unsafe-inline'` for scripts and styles (Next.js inline bootstrap, static policy).
* `npm audit` (all dependencies) still lists dev-only findings in the lint toolchain
  (`braces` via `eslint-config-next`); they are not installed with `--omit=dev`.
* No self-service password change page for trainers; no per-user email unsubscribe link in emails.
