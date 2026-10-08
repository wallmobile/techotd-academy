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

## Admin Area (Phase 10.1)

Sign in as an ADMIN or SUPER_ADMIN. There is no public way to create one
(public registration always makes a STUDENT), so the first admin must be
created out-of-band (e.g. a one-off script calling
`createUser({ ..., role: "SUPER_ADMIN" })`); everything after that is
managed from the UI.

**Routes** (all `noindex, nofollow`): `/admin` (dashboard), `/admin/users`,
`/admin/users/[user-id]`, `/admin/students`, `/admin/students/[student-id]`,
`/admin/trainers`, `/admin/trainers/new`, `/admin/trainers/[trainer-id]`,
`/admin/roles`. IDs in these URLs are **user ids**. Future sidebar sections
(CRM, Courses, Batches, Payments, Certificates, Reports, Placement, Content,
Settings) show "Soon" and have no routes.

- **Dashboard** — real counts from the database only: users, students,
  trainers, staff, users with an unexpired session, role distribution, recent
  registrations, database status. Nothing is estimated or hard-coded.
- **Lists** — server-side search (name/email, plus phone for
  students/trainers), role filter (users), sort (newest/oldest/name) and
  20-per-page pagination. The query string is sanitized and all SQL is
  parameterized.
- **Trainer creation** — `/admin/trainers/new`: name, email, optional phone,
  temporary password (min 8, bcryptjs). The role is always TRAINER, duplicate
  emails are rejected, and the password is never echoed or logged.
- **Trainer-batch assignment** — from the trainer page; reuses
  `trainer_batch_assignments`. The trainer must be a TRAINER user, the batch
  must exist in the file-based catalog, duplicates are rejected.
- **Account status** — ACTIVE/INACTIVE/SUSPENDED already existed (login and
  `getCurrentUser()` enforce it). Admins can deactivate/reactivate accounts
  (sessions are revoked on deactivation). You can't change your own account;
  only a SUPER_ADMIN can change an ADMIN/SUPER_ADMIN account; the last active
  SUPER_ADMIN can't be deactivated.
- **Roles & Access** — read-only overview. **Role editing is deferred**, and
  no user deletion exists (deactivate instead).
- **Students** — read-only: profile, enrollments, progress, attendance,
  submissions, certificates (existing data only). There is no enrollment
  creation yet.

**Security model.** Identity always comes from `getCurrentUser()` via
`src/lib/admin/context.js`. Only ADMIN and SUPER_ADMIN
(`ADMIN_MANAGEMENT_ROLES` in `src/constants/roles.js`) can use the management
pages. Every page calls `requireAdminContext()` and every Server
Action/domain function re-checks `getAdminContext()`; the proxy and layout are
not relied on. Students and trainers are redirected to their own area. Other
staff roles (COUNSELLOR, ACCOUNTANT, CONTENT_MANAGER, PLACEMENT_MANAGER) may
open `/admin` but only see a limited landing page and are redirected away from
the management routes. Admin queries never select password hashes, session
tokens or reset tokens. No schema change was needed in this phase.

**Audit log — not implemented.** Future admin phases should record role
changes, account status changes, trainer assignments, financial actions and
certificate actions.

**Still deferred (as of 10.1; CRM/leads since landed in 10.2):** enrollment creation, payments, certificate
issuing, placement, materials, announcements, advanced analytics,
notification automation, content management.

## Phase 10.2 — CRM / Leads + Enquiry Persistence

The Book Demo (`/book-demo`), Enquiry (`/enquiry`) and homepage quick-enquiry
forms now store real leads. The forms look and behave exactly as before; only
the persistence boundary changed:

```text
Form -> submitEnquiry() -> Server Action -> server validation -> leads table -> /admin/leads
```

- **Success is shown only after the database write succeeds.** On failure the
  visitor sees "We couldn't submit your request right now. Please try again."
  — no SQL, paths or stack traces; server logs contain only an error code.
- **Server-side validation** re-runs the existing `validateEnquiry.js` rules
  and checks `course`, `mode` and `batch` against the live catalog (and that
  the batch belongs to the course). Unknown values are rejected, never stored.
  Status, assignment and id can't be supplied by the browser: a new lead is
  always `NEW` and unassigned, with a generated UUID.
- **Duplicates:** there is deliberately no `UNIQUE(phone/email)` — the same
  person can enquire again. An identical request (same contact, course, mode,
  batch, message and form) within 60 seconds is treated as an accidental
  double-submit and stored once.

**Data model** (new tables only; `CREATE TABLE IF NOT EXISTS`, no existing
data touched): `leads` (name, phone, email, organization, city,
experience_level, course_slug, mode, batch_id, message, source, origin,
consent, status, assigned_to, created_at, updated_at, last_contacted_at) and
`lead_notes` (lead_id, author_user_id, note, created_at).

- **Statuses:** `NEW`, `CONTACTED`, `QUALIFIED`, `FOLLOW_UP`, `CONVERTED`, `LOST`.
- **Sources:** `BOOK_DEMO`, `ENQUIRY` (the homepage widget is an `ENQUIRY`).
  `origin` records the page tag the form already carried (`homepage`,
  `course-detail`, `training`, …, else `direct`).

**CRM routes** (`noindex, nofollow`): `/admin/leads` and
`/admin/leads/[lead-id]`, inside the existing Admin shell ("Leads / CRM" in
the sidebar).

- **List:** search (name / email / phone, wildcards treated literally),
  filters (status, source, course, mode, assigned-to), sort
  (newest / oldest / name), 20 per page, and a real per-status count row.
  Course/mode/assignee filter options come from data that exists. Internal
  notes are never shown in the list.
- **Detail:** contact, interest (course, mode, batch, message, source, page,
  consent), CRM state (status, assignee, received / updated / last contacted)
  and the internal-notes timeline.
- **Actions** (Server Actions, re-authorized on every call): update status
  (fixed list), *Mark as contacted* (the only thing that sets
  `last_contacted_at` — a plain status change never does), assign / unassign,
  add note (1–2000 characters, author and time recorded).

**Access policy.**

| Role | Leads |
| --- | --- |
| SUPER_ADMIN, ADMIN | see every lead; change status, notes; assign to anyone valid |
| COUNSELLOR | see leads assigned to them **plus the unassigned queue**; change status / mark contacted / add notes **only on leads assigned to them**; may *claim* an unassigned lead for themselves; cannot assign to others, unassign, or see/touch another counsellor's leads, assignments or notes |
| Other staff roles, STUDENT, TRAINER, anonymous | no access (redirected / refused) |

A lead can only be assigned to an **active** ADMIN, SUPER_ADMIN or COUNSELLOR.
A counsellor gets no user / student / trainer / roles administration.

**Not implemented (still deferred):** rate limiting / CAPTCHA (an in-memory
limiter would be fragile; a durable one is future work, so submission
spam-protection beyond the 60-second duplicate guard is not in place),
email / SMS / WhatsApp, follow-up scheduling, lead scoring, pipelines,
conversion analytics, lead-to-student enrollment, an audit log of CRM changes
(status / assignment history), lead editing or deletion, and data-retention /
export tooling for the personal data stored in leads.

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
- **Phase 10.1 — Admin Foundation: COMPLETE.** Real admin shell and dashboard, user/student/trainer management, trainer creation, trainer-batch assignment, read-only roles page, account activate/deactivate. See "Admin Area" below.
- **Phase 10.2 — CRM / Leads + Enquiry Persistence: COMPLETE** (see above). Public forms persist leads; `/admin/leads` with status, assignment, notes and counsellor-scoped access.
- **Phase 10.3** Student enrollment + batch operations — next, not started.

## Known Limitations

- **Homepage statistics and sample catalog data are unverified marketing
  content** (batch dates are illustrative — see `src/data/batches.js`).
  Confirm real figures before any public launch.
- Trainer accounts can be created and assigned to batches from the Admin area; the `setup:trainer` CLI remains a local development shortcut.
- Lead submissions are stored, but there is no email/SMS/WhatsApp notification, rate limiting or CAPTCHA yet (see Phase 10.2). Leads cannot be edited, deleted or exported from the UI.
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
- The Admin area covers user, student and trainer management only
  (Phase 10.1). Role editing, user deletion, an audit log, CRM, enrollment
  creation, payments, certificate issuing, placement, content, reports and
  settings are not built. Admin lists/forms have not been exercised in a real
  browser by automation (responsive layout and drawer focus restore are
  source-reviewed; live checks were HTTP-level).
- Other staff roles (counsellor, accountant, …) can sign in but only see a
  limited `/admin` landing page; per-role modules come in later phases.
- Windows native compilation of `better-sqlite3` is expected to work (see
  Requirements) but was **NOT VERIFIED** on an actual Windows machine —
  this project was built and tested in a Linux sandbox.
