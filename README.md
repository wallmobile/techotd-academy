# TechOTD Academy

The training/education platform for TechOTD Pvt. Ltd. — a public marketing
site, student login/registration, a Student LMS (courses, schedule,
assignments, attendance, certificates), and a Trainer panel (batches,
students, class sessions, attendance, assignments and evaluation).

## Tech Stack

- **Next.js 16.3.6** (App Router, Turbopack)
- **React 19.2.8**
- **Tailwind CSS v4**
- **JavaScript / JSX** — no TypeScript
- **better-sqlite3** — a local SQLite database file, no external DB server required
- **bcryptjs** — password hashing
- Server-side sessions via HTTP-only cookies (no JWT/auth library)

## Requirements

```text
Node.js: >=22   (required by better-sqlite3@13 — see node_modules/better-sqlite3/package.json "engines")
npm:     10.x or newer (bundled with Node 22)
```

`better-sqlite3` is a native module: on first `npm install` your machine
compiles it, which needs:

- **Python 3** on your `PATH`
- A C/C++ build toolchain — on Windows, **Visual Studio Build Tools** with
  the **"Desktop development with C++"** workload (or a full Visual
  Studio install with the same workload). This is a standard prerequisite
  for any Node native module, not something specific to this project.

If `npm install` fails on the `better-sqlite3` build step, install the
above and re-run `npm install`.

> This project was built and tested in a Linux sandbox; native compilation
> was verified there. Compiling `better-sqlite3` on Windows specifically
> was **NOT VERIFIED** in that environment — plain `npm install` is
> expected to work once Python 3 and the C++ Build Tools above are
> present (this is exactly what `better-sqlite3`'s own install step
> requires on any platform), but if you hit a build error, the fix is
> almost always one of those two prerequisites being missing.

## Installation

```bash
npm install
```

## Environment Setup

Copy the example file and adjust if needed:

```bash
copy .env.example .env.local        # Windows (cmd)
cp .env.example .env.local          # macOS/Linux
```

`.env.local` (git-ignored) only needs one variable, and even that has a
working default if you skip this step entirely:

```env
DATABASE_URL="file:./data/app.db"
```

`NEXT_PUBLIC_SITE_URL` is optional — it only affects the absolute URLs
written into page metadata, `robots.txt` and `sitemap.xml`, and defaults
to a placeholder production URL if unset. It has no effect on local
functionality.

Never commit `.env` or `.env.local`.

## Database Setup

There is no separate init command to run. The SQLite database file
(`data/app.db` by default) and every table are created automatically —
deterministically, from `src/lib/db/schema.sql` (`CREATE TABLE IF NOT
EXISTS`, safe to run repeatedly) — the first time the app touches the
database, which happens automatically on `npm run dev`, `npm run build`,
or `npm run start`. No production credentials, no test data, and no rows
of any kind are created automatically. The database starts completely
empty.

## Local Development

```bash
npm run dev
```

Open **http://localhost:3000**.

## Lint

```bash
npm run lint
```

## Tests

```bash
npm test
```

Uses Node's built-in test runner (`node:test`) — no extra dependencies.
`tests/register.mjs` points the app at a throwaway SQLite file in the OS
temp directory (deleted on exit; `data/app.db` is never touched) and
`tests/loader.mjs` stubs only `next/headers`, `next/cache` and
`next/navigation`. Everything else — sessions, the DB layer, server actions
and the trainer/student domain code — is the real application code. Covers:
route protection and role guards, trainer data isolation (batches, students,
submissions, evaluation, pending counts, attendance), assignment
submission/resubmission, password reset (token consumption + session
revocation) and domain-level smoke checks for the student and trainer areas.
There is no browser/e2e suite; UI behavior (drawer focus restore, loading and
error screens, responsive layout) is verified by source review and manual
checks only.

## Build

```bash
npm run build
npm run start
```

## Local Student Account

Register a normal account at **http://localhost:3000/register** — public
registration always creates a `STUDENT` account (this cannot be changed
from the form, by design).

## Local Trainer Account

Trainer accounts are **not** publicly self-registrable (also by design —
see `src/lib/auth/actions.js`). For local development, use the
development-only script below. It calls the exact same
`createUser()` / `hashPassword()` / `createTrainerBatchAssignment()`
functions the real application uses — no raw SQL, no parallel logic —
and it never runs on its own; it only runs when you explicitly invoke it.

```bash
# See available batch ids first
npm run setup:trainer -- --list-batches

# Create (or reuse) a trainer and assign a batch
npm run setup:trainer -- --name "Asha Kulkarni" --email trainer@example.com --batch full-stack-development-01
```

- Password: `--password`, else the `TRAINER_PASSWORD` environment variable
  (keeps it out of shell history), else a strong random one is generated and
  printed **once** — save it immediately, it is never stored in the repo or
  shown again. A supplied password is never echoed back, must be at least 8
  characters, and is hashed with the app's bcryptjs `hashPassword()`.
- The email must look valid. Re-assigning the same batch is a harmless
  no-op (`UNIQUE(trainer_user_id, batch_id)`), and the script says so.
- Running the command again with the same `--email` reuses the existing
  trainer (it will not create a duplicate or silently change its role).
- Omit `--batch` to create the trainer without an assigned batch; re-run
  with `--batch <id>` later to assign one.
- The script refuses to run when `NODE_ENV=production`.
- You may see a one-line Node warning
  (`[MODULE_TYPELESS_PACKAGE_JSON] ... doesn't parse as CommonJS`) the
  first time you run this — it's a harmless performance notice from
  Node's module loader about this standalone script, not an application
  error, and does not affect anything it does.

## Main Routes

**Public**
`/`, `/courses`, `/courses/[course-slug]`, `/training/online`,
`/training/offline`, `/training/classroom`, `/training/corporate`,
`/batches`, `/book-demo`, `/enquiry`

**Auth**
`/login`, `/register`, `/forgot-password`, `/reset-password` (logout is a
server action triggered from the account menu, not a page)

**Student** (requires a STUDENT login)
`/student`, `/student/courses`, `/student/courses/[course-slug]`,
`/student/courses/[course-slug]/learn`, `/student/schedule`,
`/student/assignments`, `/student/assignments/[assignment-id]`,
`/student/attendance`, `/student/batches`, `/student/certificates`,
`/student/certificates/[certificate-id]`, `/student/profile`,
`/student/notifications`

**Trainer** (requires a TRAINER login)
`/trainer`, `/trainer/courses`, `/trainer/batches`, `/trainer/students`,
`/trainer/students/[student-id]`, `/trainer/schedule`,
`/trainer/classes/new`, `/trainer/classes/[class-session-id]`,
`/trainer/attendance`, `/trainer/attendance/[class-session-id]`,
`/trainer/assignments`, `/trainer/assignments/new`,
`/trainer/assignments/[assignment-id]`

All Student/Trainer/Admin routes are `noindex, nofollow` and excluded
from `sitemap.xml`.

## Trainer Data Isolation (Phase 9.4)

A trainer only ever sees or evaluates students enrolled in batches they are
assigned to — never "everyone in the same course". Identity always comes
from the session (`getCurrentUser()`); no trainer/student/batch id from a
form or URL is trusted as proof of ownership.

- **Student scope** — submissions, pending-review counts and evaluation are
  restricted to students with a non-cancelled `batch_enrollments` row in one
  of the trainer's batches (`src/lib/db/assignmentSubmissions.js`).
- **Batch-scoped assignment** — manageable only by a trainer who manages that
  batch (and the batch must belong to the assignment's course).
- **Course-wide assignment** (no batch) — manageable only by the trainer who
  created it (`assignments.created_by`, set from the session). Rows created
  before this column existed have no author and stay manageable by any
  trainer of that course; their submissions are still student-scoped.
- **Schema change** — `assignments.created_by` (nullable). Added to
  `schema.sql` for fresh databases and applied to existing ones by the
  additive, idempotent migration in `src/lib/db/client.js`; no data is
  dropped or recreated.
- A resubmission clears the previous `score`, `feedback` and `evaluated_at`
  and returns the row to `SUBMITTED`.
- A successful password **reset** consumes the token, sets the password and
  revokes every existing session for the account in one transaction; the
  user must sign in again. (Password *change* keeps the current browser
  signed in and preserves remember-me.)

## Phase Status

- **Phase 9.1** Trainer foundation — done.
- **Phase 9.2** Teaching management (schedule, classes, attendance,
  assignments, evaluation) — done.
- **Phase 9.3 — DEFERRED (not implemented, on purpose):** Trainer Materials,
  Trainer Announcements, Trainer Profile, advanced Trainer performance
  analytics. Their sidebar entries show "Soon" and have no routes.
- **Phase 9.4** Stabilization, security and regression — done: resubmission
  fix, trainer isolation, password-reset session revocation, loading/error
  states for the student and trainer areas, drawer focus restoration, test
  safety net.
- **Phase 10** Admin foundation — next, not started.

## Known Limitations

- **Homepage statistics and sample catalog data are unverified marketing
  content** (batch dates are illustrative — see `src/data/batches.js`).
  Confirm real figures before any public launch.
- Trainer accounts and trainer-batch assignments exist only via the
  `setup:trainer` CLI until the Admin panel (Phase 10) exists.
- Enquiry/demo-booking forms do not persist submissions yet.
- No avatar upload / trainer profile (Phase 9.3, deferred).
- Batch status is static catalog data; there is no real enrollment flow and
  no real lesson content — students are enrolled by data seeding only.
- Course-wide assignments created before Phase 9.4 have no recorded author
  (see Trainer Data Isolation).
- No automated browser/e2e suite exists; `npm test` is Node-level. UI-only
  behavior (drawer focus restore, loading/error screens, responsive layout)
  has not been exercised in a real browser by automation.

- **Attendance double-submit — UI-text assertion vs. verified data
  behavior.** Submitting the trainer attendance form twice in a row is
  genuinely idempotent at the data layer: a direct database check after a
  double-submit confirmed exactly one row per (student, class session),
  with `updated_at` advancing on the second save — reproduced on two
  separate test runs. One automated Playwright assertion that checks for
  a specific "Attendance saved" confirmation *text* after the second
  click has occasionally failed even with a generous wait, which looks
  like UI-timing flakiness in that one test rather than a data problem.
  Reported honestly rather than claiming a fully green automated suite.
- No file-upload support for assignment submissions or evaluation
  attachments.
- No email delivery yet for password reset or trainer evaluation
  notifications (the underlying flows are built and API-ready; sending
  real email needs a provider configured, which is intentionally out of
  scope so far).
- No Admin Panel. A placeholder `/admin` route exists (gated by the same
  role-based authorization as everything else) but has no real
  functionality — building it out is future work, not part of this
  handoff.
- Windows native compilation of `better-sqlite3` is expected to work (see
  Requirements) but was **NOT VERIFIED** on an actual Windows machine —
  this project was built and tested in a Linux sandbox.
