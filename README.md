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
- **PostgreSQL** (via `pg`) — any PostgreSQL server or managed service (Neon, Supabase, RDS, ...); the app itself is stateless, so it also runs on Vercel
- **bcryptjs** — password hashing
- Server-side sessions via HTTP-only cookies (no JWT/auth library)

## Requirements

```text
Node.js: >=22.9
npm:     10.x or newer (bundled with Node 22)
PostgreSQL: a server you can create a database on (verified on PostgreSQL 18)
```

There are no native modules to compile: `pg` is pure JavaScript, so `npm install`
needs no Python or C++ toolchain.

## Installation

```bash
npm install
```

## Environment Setup

Copy the example file and fill in your database URL:

```bash
copy .env.example .env.local        # Windows (cmd)
cp .env.example .env.local          # macOS/Linux
```

`.env.local` (git-ignored) needs one variable:

```env
DATABASE_URL="postgres://user:password@localhost:5432/techotd_dev"
```

Use a local or throw-away database for development — **never the production one**. For a hosted
database (Neon etc.) use its connection string with `?sslmode=require`. Special characters in the
password must be percent-encoded.

`NEXT_PUBLIC_SITE_URL` is optional locally — it only affects the absolute URLs written into page
metadata, `robots.txt` and `sitemap.xml`, and defaults to a placeholder production URL if unset.

Never commit `.env` or `.env.local`.

## Database Setup

**Quickest (local development):** `npm run db:start` creates a development PostgreSQL inside the
project (`data/pg`, git-ignored, 127.0.0.1:54329, uses the PostgreSQL binaries already installed on
the machine), creates the `techotd_dev` database and adds its `DATABASE_URL` to `.env.local`.
Stop it with `npm run db:stop`; start it again with `npm run db:start` after a reboot.
Coming from the old SQLite version? `npm run db:import-sqlite` copies `data/app.db` into the
(empty) PostgreSQL database — read-only on the SQLite side, all-or-nothing, sessions not copied.

Otherwise create an empty database (`createdb techotd_dev`) and point `DATABASE_URL` at it. There is no
separate init command: every table is created automatically — deterministically, from
`src/lib/db/schema.js` (`CREATE TABLE IF NOT EXISTS`, safe to run repeatedly, applied under a
lock so many processes starting together are safe) — the first time the app touches the database.
No test data and no rows of any kind are created automatically. The database starts completely
empty. Create the first admin with `npm run setup:admin` (see below).

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

Uses Node's built-in test runner (`node:test`). `scripts/run-with-pg.mjs` starts a **temporary
PostgreSQL cluster** from the PostgreSQL binaries already installed on the machine (set `PG_BIN` to
their `bin` folder if they are not on `PATH`), or uses the server in `TEST_PG_ADMIN_URL` if you set
one; `tests/register.mjs` gives every test file its own throw-away database (`techotd_t_*`, never
`DATABASE_URL`), and `tests/loader.mjs` stubs only `next/headers`, `next/cache` and
`next/navigation`. Everything else — sessions, the DB layer, server actions and the domain code — is
the real application code. Covers: route protection and role guards, data isolation, fees,
certificates, enrollment, CRM, placement, notifications, AI limits, analytics, catalog,
deployment/config checks, database constraints and concurrency (several processes, simultaneous
payments/enrollments/certificates), backup/restore.

Browser tests (`npm run build` first, then `npm run test:e2e`) drive real Chrome against the
production build and an isolated PostgreSQL database.

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
(public registration always makes a STUDENT). Create the first one locally with
`npm run setup:admin -- --name "Your Name" --email you@example.com` (uses the
app's own hashing; password from `--password`, `ADMIN_PASSWORD`, or a random one
printed once; refuses `NODE_ENV=production`; never changes an existing
account's role). Login at `/login`, which redirects to `/admin`. Everything
after that is managed from the UI. In production, create the first admin
through your own operational process against the production database.

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
  submissions, certificates. Enrollments are created from the Enrollments
  area (Phase 10.3).

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

**Super Admin console (`/super-admin`).** A SUPER_ADMIN signs in to its own
console instead of the shared Admin shell (`ROLE_HOME_ROUTES`), and can still
open `/admin` from the console nav. It holds the controls an ADMIN must not
have: an overview (staff by role, admin-account count, system status),
`/super-admin/staff` (all staff accounts, search/role filter) and
`/super-admin/staff/new` (create an ADMIN, COUNSELLOR, ACCOUNTANT,
CONTENT_MANAGER or PLACEMENT_MANAGER). Activate/deactivate stays on
`/admin/users/[user-id]` (already Super-Admin-only for admin accounts, with
self-lockout and last-Super-Admin protection). SUPER_ADMIN, STUDENT and
TRAINER can never be created from this form — a new Super Admin is bootstrapped
with `npm run setup:admin`. Access is `requireSuperAdminContext()` per page and
`getSuperAdminContext()` in every domain function and Server Action
(`src/lib/superAdmin/`); ADMIN and every other role are redirected to their own
area. Role editing and the audit log are still deferred.

**Audit log — not implemented.** Future admin phases should record role
changes, account status changes, trainer assignments, financial actions and
certificate actions.

**Still deferred (as of 10.1; CRM/leads landed in 10.2, enrollment in 10.3):** payments, certificate
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

## Phase 10.3 — Student Enrollment + Batch Operations

Admins can now enroll students and convert leads into students:

```text
Website lead -> CRM -> Convert to student -> Enroll (course + batch) -> Student LMS -> Trainer
```

**No new enrollment table.** An enrollment is the existing
`batch_enrollments` row (student + batch; the course is the batch's course in
the catalog) together with the student's `course_enrollments` row for that
course. Creating one writes both in a single transaction; the student LMS
(`/student/courses`, `/student/batches`, schedule, …) and the trainer student
lists already read these tables, so they reflect admin enrollments
automatically.

- **Statuses:** `ACTIVE`, `COMPLETED`, `CANCELLED` (the values the tables
  already used). Records are never deleted — cancelling sets `CANCELLED`, so
  the rows are the history. The course-level status is *derived* from the
  student's batch enrollments in that course (any ACTIVE -> ACTIVE, else any
  COMPLETED -> COMPLETED, else CANCELLED).
- **Server-side rules** (the form is only a convenience): the student exists,
  is a `STUDENT` and is `ACTIVE`; the course is in the catalog; the batch
  exists, **belongs to that course** and has status `Open` or `Upcoming`
  (anything else, e.g. a future "Closed", is refused); no duplicate active
  enrollment for the same student + batch. A cancelled enrollment is
  re-activated in place (same row); a completed one is not re-created.
  Moving an enrollment back to ACTIVE re-checks that the batch is still open.
- **Batch capacity is NOT enforced:** the batch catalog (`src/data/batches.js`)
  has no capacity field and none was invented. Capacity limits are deferred
  until batches carry real seat counts.

**Routes** (`noindex, nofollow`, ADMIN / SUPER_ADMIN only):
`/admin/enrollments` (search by name / email / phone; filter by course,
batch, status; sort; 20 per page; completed and cancelled included),
`/admin/enrollments/new` (pick an active student by search, then course, then
a batch of that course; supports `?student=&course=&batch=` prefill, validated
server-side) and `/admin/enrollments/[enrollment-id]` (details + status
change). The student page has **+ Enroll Student** and links each enrollment;
the dashboard shows real Active / Completed / Cancelled counts.

**Lead -> student conversion** (lead page, ADMIN / SUPER_ADMIN only — counsellors
can work leads but cannot create accounts or enrollments):

- Matches an existing account **by the lead's email**. An existing *active
  STUDENT* is reused (nothing is duplicated and their password is untouched).
  An account with that email that is **not** a student (or is inactive) is
  never converted, changed or linked — the admin gets an explanatory error.
- Otherwise a `STUDENT` is created through the existing user layer with an
  admin-entered **temporary password** (min 8 chars, bcryptjs-hashed; shown
  nowhere and never logged). Nothing is emailed — no mail provider exists —
  so share the credentials securely.
- The account, `leads.status = CONVERTED` and the link
  (`leads.converted_user_id`, `converted_at`) are written in one transaction;
  a lead can be converted only once. After conversion the lead page shows the
  student, their enrollments and an **+ Enroll student** button that prefills
  the lead's course and batch. (A lead whose status was merely *set* to
  Converted by hand has no student link and can still be converted.)
- Phone numbers are not used for matching (not unique, easy to mismatch).

**Database change:** `leads.converted_user_id` and `leads.converted_at`
(nullable). Added to `schema.sql` for new databases and by the idempotent
migration in `src/lib/db/client.js` for existing ones — which now also
tolerates two processes migrating at the same moment (Next's parallel build
workers). No tables were dropped or recreated.

**Access summary:** only ADMIN / SUPER_ADMIN create or change enrollments and
convert leads. Trainers see only students enrolled in batches assigned to them
(a cancelled enrollment disappears from their list). Students only ever see
their own enrollments, derived from their session — no student id is accepted
from the browser — and cannot change them.

**Still deferred:** batch capacity, payments / invoices, certificates, bulk
enrollment or CSV import, student self-enrollment, enrollment audit trail,
email / SMS notifications of credentials or enrollment, and lead-to-student
conversion by counsellors.

## Phase 10.4 — Fees and Payments

Fee management for real enrollments, with manually recorded payments and an
integration boundary for a future payment gateway.

- **No prices are invented.** Course prices don't exist in this app; a fee is
  an amount an authorized staff member explicitly assigns to **one**
  enrollment (`fee_plans`, unique per `batch_enrollments` row; edit it rather
  than stacking plans). Net payable = total − discount.
- **Money is integer minor units** (paise) with an explicit currency
  (`INR` is the only configured one — `src/constants/fees.js`). Decimal input
  is parsed from the string; floats are never used for totals.
- **Status is derived, never stored:** `PENDING`, `PARTIALLY_PAID`, `PAID`,
  `OVERDUE` (past due date with a balance) or `CANCELLED`. A plan is "paid"
  only because counted payments cover it.
- **Payments** (`payments`) are append-only. Manual payments are stored as
  `source = MANUAL`, `status = RECORDED`, attributed to the staff member, and
  can never claim to be gateway-verified. Overpayment is refused. A mistaken
  entry is **voided** (reason + actor kept) — never deleted; its receipt stops
  opening. A plan with counted payments can't be cancelled; a fee can't be
  edited below what has been paid.
- **Receipts:** one per recorded payment (`RCPT-YYYY-NNNNNN`), opened through an
  unguessable token. They acknowledge a payment — they are **not** tax
  invoices (no tax/GST data exists).
- **Audit:** `audit_log` records who/what/when for fee and payment changes
  (non-secret fields only); the fee page shows the change history.
- **Atomic and idempotent:** each financial write is one IMMEDIATE
  transaction (rolled back entirely on failure). A double-submitted payment
  form records once (per-render idempotency key), and a provider
  transaction can only be recorded once.

**Routes** (`noindex`): `/admin/fees` (search, status / course filters, sort,
20 per page, real totals), `/admin/fees/new` (pick an enrollment, enter the
fee), `/admin/fees/[fee-id]` (details, record / void payments, edit, cancel,
history), `/admin/fees/[fee-id]/receipt/[payment-id]`; students:
`/student/fees` and `/student/fees/receipt/[token]` (own data only,
read-only). Enrollment pages link to "Assign fee".

**Access:** SUPER_ADMIN, ADMIN and ACCOUNTANT manage fees and payments.
Counsellors, trainers, content / placement managers have no finance access.
Students see only their own fees and receipts, derived from their session.

**Payment gateway: NOT integrated.** No provider, credentials, checkout or
webhook route exist, and the app never reports an online payment as
successful. `src/lib/fees/gateway.js` is the documented boundary:
`verifyWebhookSignature()` (HMAC-SHA256, constant time) and the idempotent
`confirmGatewayPayment()` (validates amount/currency/overpayment, safe against
replays and out-of-order delivery) are implemented and tested with **fake
fixtures only**. To go live: set `PAYMENT_PROVIDER` and `PAYMENT_WEBHOOK_SECRET`
(server-side env only), add a webhook route handler that verifies the
signature on the raw body and then calls `confirmGatewayPayment()`, and
add a provider checkout. None of that has been tested against a real provider.

**Not implemented:** refunds, instalment schedules, tax invoices / GST,
reminders or notifications, reconciliation reports, multi-currency.

## Phase 10.5 — Certificates

Real issuance, PDF download, public verification and revocation, built on the
existing `certificates` table (extended additively — nothing dropped).

- **Eligibility is explicit** and computed only from data the LMS can prove,
  for one enrollment: (1) not cancelled, (2) marked **COMPLETED** by staff,
  (3) **every course lesson completed** (`lesson_progress`). All three =
  automatic issuance (`AUTO_COMPLETE`). Attendance and assignment counts are
  shown for context only — no thresholds exist, so none are invented.
- **Manual approval:** staff outside that rule can issue with a written reason
  (≥ 10 characters). It is stored and displayed as `MANUAL_APPROVAL` with the
  reason and approver — never as automatic completion. A cancelled enrollment
  can never be issued.
- **One active certificate per student + course** (checked in the issuing
  transaction and backed by a partial unique index). Numbers
  (`TOA-YYYY-XXXXXXXXXX`) and verification tokens are unique. A revoked
  certificate can be followed by a new one.
- **PDF:** generated on request from the record with a small built-in PDF
  writer (no new dependency): TechOTD Academy branding, student name, course,
  number, date and verification URL. It carries **no signature, seal,
  accreditation or QR code** (none are configured). Names/titles outside
  Latin-1 render as `?` in the PDF only (built-in fonts); the record and the
  verification page keep the exact text. Revoked certificates can't be
  downloaded.
- **Verification:** `/verify-certificate/[token]` is public, not indexed, and
  uses an unguessable token (the certificate number is *not* a lookup key).
  It shows validity, number, holder name, course, issue date and issuer —
  never email, phone, ids, enrollment data or the revocation reason. Unknown
  or malformed tokens get one identical "not found" page. **There is no rate
  limiting** on this route (the app has no limiter); tokens are the only
  protection against enumeration.
- **Audit:** issuance and revocation are written to `audit_log` and shown on
  the certificate page; revocation needs a reason and keeps the record.

**Routes:** `/admin/certificates`, `/admin/certificates/new`,
`/admin/certificates/[certificate-id]` (+ `/download`), student
`/student/certificates`, `/student/certificates/[certificate-id]` (+
`/download`), public `/verify-certificate/[token]`. ADMIN and SUPER_ADMIN
issue, revoke and download; students see and download only their own.

**Not implemented:** bulk issuance, e-mailing certificates, QR codes,
signatures/seals, templates per course, and per-course attendance/assignment
completion rules.

## Phase 10.6 — Placement and Jobs

A basic, honest job board and application pipeline. **No jobs, companies or
placement figures are seeded or invented** — the board is empty until staff
post a real opening.

- **Jobs** (`jobs`): title, company, description, location, employment type,
  work mode, experience, skills, optional deadline. A new job is always a
  `DRAFT`; staff publish, unpublish or close it explicitly. Students see only
  **PUBLISHED jobs whose deadline has not passed**; drafts, closed and
  expired jobs are hidden and reject applications.
- **Applications** (`job_applications`): one per student per job
  (UNIQUE). The applicant is always the signed-in student; the browser sends
  only the job id and an optional message. A student may apply if they have an
  **ACTIVE student account with an ACTIVE or COMPLETED enrollment**. There is
  **no resume/file upload** — staff see the student's name, email, phone,
  city and bio plus the message. A withdrawn application can't be
  re-submitted.
- **Pipeline:** `APPLIED → UNDER_REVIEW → SHORTLISTED → INTERVIEW → SELECTED`
  (or `REJECTED`; `REJECTED` and `WITHDRAWN` are final). Only staff advance it,
  the allowed transitions are enforced on the server, and a student can only
  *withdraw their own* application. Internal staff notes are never selected
  by any student-facing query.
- **Verified placements are separate from "Selected".** A placement manager
  must explicitly confirm that a SELECTED candidate actually joined
  (`placement_confirmed_at/by`, with an optional note). Only confirmed
  placements are counted; moving a candidate out of SELECTED clears the
  confirmation. No percentages, packages, employer logos or partner counts are
  shown.
- **Metrics** on `/admin/jobs` are real counts: published jobs, open jobs,
  applications, under review, shortlisted, verified placements.
- **Audit:** job and application changes are written to `audit_log` (job page
  shows its history).

**Routes** (all `noindex`): `/admin/jobs`, `/admin/jobs/new`,
`/admin/jobs/[job-id]` (edit, publish, review applications, confirm
placements); students: `/student/jobs` (search, type / mode filters,
10 per page), `/student/jobs/[job-id]`, `/student/jobs/applications`.

**Access:** SUPER_ADMIN, ADMIN and PLACEMENT_MANAGER manage jobs and
applicants. Trainers, counsellors, accountants and content managers have no
access to applicant data. Students see only open jobs and their own
applications.

**Not implemented:** resume upload, employer accounts or logins, interview
scheduling, e-mail/WhatsApp notifications, saved jobs, per-course
eligibility rules, and a placement-statistics dashboard beyond the counts
above.

## Production Readiness Notes

Findings from the pre-Phase-10.7 audit and what was done about them:

- **Throttling (added).** Sign-in (10 per 15 min per IP+email, 60 per IP),
  password-reset requests (5 per 15 min per IP+email), the public enquiry
  forms (10 per 10 min per IP) and the public certificate-verification page
  (60 per minute per IP) are rate limited. Counters live in the
  `rate_limits` table of the **PostgreSQL database**, so every server instance
  using that database shares them (one atomic statement per hit); identifiers are hashed. **Limit of scope:** the client IP
  is read from `X-Forwarded-For` / `X-Real-IP`, which is only trustworthy behind
  a reverse proxy you control that overwrites those headers. A multi-host or
  internet-exposed deployment should also rate limit at the proxy/WAF.
- **Security headers (added).** `X-Content-Type-Options`, `X-Frame-Options:
  DENY`, `Referrer-Policy`, `Permissions-Policy`, and HSTS in production. No
  Content-Security-Policy is set yet (Next.js inline scripts need a nonce setup).
- **robots.txt (changed).** `/admin`, `/student`, `/trainer` and
  `/verify-certificate` are disallowed in addition to being `noindex`.
- **Site URL.** Set `NEXT_PUBLIC_SITE_URL` in production. Without it, outside
  production the placeholder `https://academy.techotd.com` is used for
  metadata, and in production certificates carry only the site-relative
  verification path instead of a guessed domain.
- **Secrets** are read only from server environment variables
  (`DATABASE_URL`, `PAYMENT_*`, and the notification / AI settings below).
  None are committed; `.env*` and database files are git-ignored.
- **Not browser-tested.** No browser automation exists in this repository;
  flows are verified through automated tests and HTTP-level checks of
  production builds.

## Phase 10.7 — Notifications

One reusable notification service on top of the existing `notifications`
table (extended additively: `link`, `event_key`).

- **In-app:** every user has a feed — students at `/student/notifications`
  (existing), staff at `/admin/notifications`, trainers at
  `/trainer/notifications` — with an unread bell in each header. Viewing the
  feed never marks anything read; only "Mark as read" / "Mark all as read"
  do, and both are scoped to the signed-in user in SQL. Feeds are paginated.
- **Events** (created only *after* the underlying operation committed, never
  for a rejected or rolled-back one, and only on a real change): student
  enrolled / status changed; fee assigned; payment recorded / voided;
  certificate issued / revoked; application status changed; placement
  confirmed; lead assigned to a staff member. Wording is generic — no
  amounts, receipt numbers, emails, reasons or lead data. Each event has a
  stable key, and `UNIQUE(user_id, event_key)` makes a retry create at most
  one notification.
- **Email** (`src/lib/notifications/email.js`): Resend adapter over HTTPS using
  `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` (server env only).
  Without them nothing is sent; each delivery is recorded as `SKIPPED`
  (`provider_not_configured`) and in-app notifications are unaffected. States:
  `QUEUED → SENDING → SENT | FAILED`, or `SKIPPED`. **`SENT` means the
  provider accepted the message — inbox delivery is not confirmed** (no
  delivery webhook is wired). Transient failures (network, timeout, 429, 5xx)
  retry with backoff (1 / 5 / 15 min) up to 3 attempts, then `FAILED`;
  permanent 4xx failures fail immediately; stored errors are short codes only.
  Emails go only to ACTIVE users with a valid address; there are no
  marketing emails and no per-user unsubscribe preference yet. The adapter
  has been exercised only against a mocked `fetch`, **not** against the real
  provider (no credentials exist here).
- **Sending:** a small bounded flush runs right after a notification is
  created; leftovers and retries are processed by `POST
  /api/notifications/process` (header `x-cron-secret` = `CRON_SECRET`;
  404 when the secret is unset or wrong) from an external scheduler, or by an
  admin at `/admin/notifications/deliveries` ("Process queue now" / "Retry
  failed"). There is no in-process scheduler.
- **WhatsApp** (`src/lib/notifications/whatsapp.js`): a boundary only. No
  provider, credentials or approved templates exist and the database has no
  opt-in field, so **nothing is ever sent** and no message is ever reported as
  sent or delivered.
- **Admin visibility:** `/admin/notifications/deliveries` (ADMIN and
  SUPER_ADMIN) shows provider status, counts and recent deliveries.

## Phase 10.8 — Analytics and Reports

`/admin/analytics`: operational figures aggregated directly from the real
tables (parameterized `COUNT` / `SUM` / `GROUP BY`, backed by date indexes).
Nothing is estimated, trended or invented; an empty period shows zeros and
"No data in this period".

**Period:** presets (today, last 7 / 30 days, this month) or a custom range
(`?preset=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`). **All boundaries are UTC
calendar days, inclusive.** A range is validated server-side (valid dates,
start ≤ end, not in the future, at most 366 days); anything else falls back to
the last 30 days with a message. Reports are computed per request and show
when they were generated — nothing is cached.

**Sections and who sees them** (enforced on the server; the data is not
fetched for roles that lack the section):

| Section | Roles |
| --- | --- |
| Registrations, Enrollments, Certificates | SUPER_ADMIN, ADMIN |
| Leads & enquiries | SUPER_ADMIN, ADMIN (all leads); COUNSELLOR (own assigned + unassigned queue, labelled) |
| Fees & payments | SUPER_ADMIN, ADMIN, ACCOUNTANT |
| Jobs & placements | SUPER_ADMIN, ADMIN, PLACEMENT_MANAGER |

Students, trainers and content managers have no access.

**Definitions**

- *In period* metrics use the record's timestamp (leads/enrollments/fees/
  certificates created or issued, applications received); *as of now* metrics
  (status snapshots, outstanding, open jobs) ignore the period.
- **Enrollment** = one batch enrollment (student + batch). Course-enrollment
  rows are derived from these and never counted a second time.
- **Collected** = counted payments by the date received (`paid_on`) on active
  fees. Manually recorded and gateway-verified amounts are reported
  separately; **voided payments and cancelled fees are excluded** (voids are
  shown as their own line). Recorded manual payments are offline receipts,
  not online revenue. Amounts are grouped per currency and never summed
  across currencies.
- **Outstanding** = net fee − counted payments, on active fees, where > 0;
  *overdue* = of that, past the due date (as of now).
- **Verified conversion** = a lead linked to a student account by the
  conversion flow (in the period it was converted). Leads that were only
  *marked* Converted are shown separately and never counted as conversions.
- **Selected ≠ placed.** A verified placement needs explicit staff
  confirmation; applications are reported by current status, placements only
  when confirmed.

**CSV export** (ADMIN / SUPER_ADMIN only): `/admin/analytics/export?type=summary|daily`
with the same period. Aggregates only — no names, emails, phone numbers or
ids. At most 1000 rows, `no-store`, never a public URL. Text cells beginning
with `=`, `+`, `-`, `@`, tab or CR are prefixed with `'` to prevent
spreadsheet formula injection; fields are RFC 4180 quoted; the file starts
with a UTF-8 BOM.

**Not implemented:** period-over-period comparisons or growth percentages,
revenue forecasting, cohort / funnel analysis, scheduled reports, and
per-trainer or per-course drill-downs.

## Phase 10.9 — AI Features

Optional, server-side, and safe to leave unconfigured. Without configuration
the AI assistant shows a clear "not available" state and never fabricates an
answer; everything else in the app is unaffected.

**Configuration** (server environment only; keys and model names never reach
the browser): `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, `AI_MODEL`
(required — there is deliberately no default model), optional
`AI_MAX_OUTPUT_TOKENS` (default 600, max 1000) and `AI_TIMEOUT_MS` (default
20000, max 30000). The Anthropic Messages API adapter
(`src/lib/ai/provider.js`) has been tested **only against a mocked `fetch`** —
it has not been verified against the real service because no credentials exist
in this project. There are no tools / function calling, no streaming and no
automatic retries.

**What is implemented** (`/student/assistant`, students only):

- **Learning assistant.** One question per request (2–1000 characters), plus
  optionally the *outline* (module and lesson titles) of one course the
  student is enrolled in. The model receives only: a fixed system prompt, that
  outline, and the question inside delimiters as untrusted input. It receives
  no name, email, grades, fees, enrollments, other students' data, CRM,
  placement or staff data. The catalog has outlines, not lesson bodies, and the
  assistant is told so; it is also told it does not know Academy policies.
  Answers are shown as plain text with an "AI-generated, may be wrong"
  notice.
- **Course recommendations.** Always available from the real catalog
  (deterministic keyword / technology matching, with the matched terms as the
  reason, never suggesting a course the student is already enrolled in) and
  labelled **Catalog match**. When AI is configured the model may only *choose
  among and explain* the top catalog candidates; its JSON is validated (slugs
  must be among the candidates, reasons bounded plain text) and anything
  invalid falls back to the catalog result. Suggestions never promise jobs.
- **Job fit.** On a job page, a deterministic comparison of the job's listed
  skills with technologies in the student's active/completed courses (matching
  skills, missing skills, Academy courses that cover them). No AI is involved,
  it is guidance only, it never affects an application, and it states that it
  is not an assessment.

**Safety model**

- The student identity always comes from the session; nothing user-supplied
  selects whose data is used. A course outline is only sent for a course the
  student is enrolled in.
- AI output is plain text only — control characters stripped, length bounded,
  rendered escaped (never as HTML or markdown) — and is never passed to any
  function that changes records. The model has no tools and no database or
  filesystem access, so a successful prompt injection has nothing to read or
  change.
- **Limits:** 20 requests per 10 minutes and 50 provider calls per UTC day per
  user (shared across processes through the database), one in-flight request
  per user *per server process*, input/output length caps, and a request
  timeout. There is no cross-host concurrency limit.
- **Privacy:** prompts and answers are **not stored** — there is no
  conversation history to retrieve or delete. Only minimal usage metadata
  (user, feature, outcome, sizes, token counts) is kept in `ai_usage` for the
  daily cap; it is removed with the user. Logs contain only short error codes.

**Not implemented:** conversation history, lesson-content retrieval (no lesson
bodies exist), AI-generated practice-quiz grading, AI job-application
feedback, trainer/admin AI tools, and streaming responses.

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
- **Phase 10.3 — Student Enrollment + Batch Operations: COMPLETE** (see above; batch capacity deferred — the catalog has none).
- **Phase 10.4 — Fees and Payments: COMPLETE** (manual payments; no payment gateway is integrated — see above).
- **Phase 10.5 — Certificates: COMPLETE** (PDF download + public verification; no QR/signatures).
- **Phase 10.6 — Placement and Jobs: COMPLETE** (job board, applications, staff review, confirmed placements; no resume upload).
- **Phase 10.7 — Notifications: COMPLETE** (in-app live; email adapter tested against mocks only; WhatsApp is an unconfigured boundary).
- **Phase 10.8 — Analytics and Reports: COMPLETE** (real-data reports, role-scoped sections, safe CSV export).
- **Phase 10.9 — AI Features: COMPLETE** (learning assistant, recommendations, deterministic job fit; AI provider tested against mocks only and unconfigured here).

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
- The Admin area covers users, students, trainers, leads and enrollments
  (Phases 10.1–10.3). Role editing, user deletion, an audit log, payments,
  certificate issuing, placement, content, reports and
  settings are not built. Admin lists/forms have not been exercised in a real
  browser by automation (responsive layout and drawer focus restore are
  source-reviewed; live checks were HTTP-level).
- Other staff roles (counsellor, accountant, …) can sign in but only see a
  limited `/admin` landing page; per-role modules come in later phases.

## Phase 10.11 — Courses & Batches Management and Staff Password Change

**Routes** (ADMIN / SUPER_ADMIN only, `noindex`; enforced per page and per action on the server):
`/admin/courses` (list with search, category/level/status filters, sort, 20 per page), `/admin/courses/new`,
`/admin/courses/[course-slug]` (details, edit, publish/unpublish, its batches, change history),
`/admin/batches` (search, course/status/mode filters, sort, pagination), `/admin/batches/new`,
`/admin/batches/[batch-id]` (details, edit, status, trainers, enrollments, change history).
Staff self-service: `/admin/account` (any admin-area staff role).

**How it fits the existing data model.** Courses and batches have always been defined in code
(`src/data/courses.js`, `batches.js`) and every other table references them by slug / id string, so
nothing was renamed or moved. Two additive tables overlay that catalog: `catalog_courses` and
`catalog_batches`. A `BASE` row stores admin edits to a code-defined record (a NULL column keeps the code
value); a `CUSTOM` row is a course/batch created in the admin panel. `src/lib/catalog.js` merges the two on
every read (no cache, so it can't go stale), and every consumer — public site, student and trainer areas,
enrollment, fees, certificates, CRM, AI — reads through it. Client components receive catalog data as props.
The public pages are rendered per request (`force-dynamic`) so a course created in production appears
immediately instead of being frozen at build time.

**Rules**
- Nothing is ever deleted. A course is **unpublished**: it leaves the public catalog, course page (404), sitemap,
  enquiry forms, recommendations and new enrollments, but existing enrollments, fees, certificates and the
  student's own view keep resolving it. A batch is moved to **Closed / Completed / Archived**; only
  Open/Upcoming batches of published courses are public and enrollable. Archiving is refused while any
  enrollment in the batch is ACTIVE.
- A course's URL name (slug) and a batch's course are fixed at creation (enrollments, fees and certificates refer
  to them). Batch ids are generated (`<course-slug>-NN`). A batch's mode must be one the course offers; end date
  cannot precede the start date; a same course + mode + start date + schedule batch is refused as a duplicate.
- Trainer assignment uses the existing `trainer_batch_assignments` table: only ACTIVE `TRAINER` users, duplicates
  reported, removal asks for confirmation and keeps class / attendance / assignment records.
- Every create / edit / status / trainer change writes an `audit_log` row (who, what, when; never field contents)
  shown as "Change history". Destructive-ish actions (unpublish, close/complete/archive, remove trainer) require a
  confirmation dialog.
- Editable course fields: title, summary, description, category, level, duration + band, modes, technologies,
  prerequisites, outcomes. Syllabus modules, projects and FAQs remain content files and are not edited here.

**Deliberately not added:** course *fees* (fees are assigned per enrollment; no prices are invented) and batch
*seat capacity* (not in the schema; adding it needs its own concurrency-safe design).

**Migration.** Purely additive (`CREATE TABLE IF NOT EXISTS`); tested against a copy of the existing development
database (no rows lost, integrity OK, idempotent). `npm run backup` includes the new tables.

**Staff password change** (`/admin/account`): requires the current password, validates the new one, revokes every
session for the user and starts a fresh one for the current browser (remember-me preserved), rate limits
current-password attempts (8 per 15 minutes per account), and audits the change without any password data.
Students keep their own flow on the profile page; trainers do not yet have a self-service password page.

## Deployment Prerequisites & Verification (Phase 10.10)

> **Staging / production deployment:** see [docs/STAGING.md](docs/STAGING.md) (environment, build and
> start, Vercel + managed PostgreSQL setup, migrations, backup and restore, health check `/api/health`,
> smoke tests, rollback, and exactly what is and is not verified). `NEXT_PUBLIC_SITE_URL` must be set
> at **build** time as well as at runtime; the server validates its configuration at start
> (`src/instrumentation.js`) and exits on a dangerous setting. `npm run backup:verify -- <file>`
> checks a backup.

**Required in production**
- `NEXT_PUBLIC_SITE_URL` (absolute https URL), `DATABASE_URL`.
- HTTPS termination in front of the app (session cookies are `Secure`).
- For password reset to work: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` **and** `NEXT_PUBLIC_SITE_URL`. Without them the forgot-password page says reset by email is unavailable; no token is created. (Adapter verified with mocks only.)
- `TRUSTED_PROXY_HOPS` set to the number of proxies you operate (default 1; 0 if directly exposed).

**Topology.** Rate limiting and AI limits live in PostgreSQL, so they are shared by every instance using the same database (including several serverless instances). Add proxy/WAF limits in front for volumetric abuse.

**Content-Security-Policy.** Static policy (self-only; no remote origins; no framing/plugins). `'unsafe-inline'` remains for script/style because Next.js emits inline bootstrap code and a nonce would force all public pages dynamic. Tested in real Chrome: no violations across the app.

**Backups.** Turn on your database provider's backups / point-in-time recovery first. `npm run backup [file]` additionally writes a `pg_dump` archive (never overwrites; needs the PostgreSQL client tools); `npm run backup:verify -- <file>` checks it. Schedule it and copy off-host.

**Email preferences.** Each user can switch off email delivery on their notifications page (in-app unaffected).

**Browser tests.** `npm run build`, then `npm run test:e2e` (uses installed Chrome/Edge via playwright-core; set `E2E_CHROME` to override; isolated temp DB; no real providers).
