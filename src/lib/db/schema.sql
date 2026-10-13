-- TechOTD Academy — authentication schema (Phase 7)
--
-- Only the tables required for authentication/authorization are defined
-- here. Domain modules (courses, enrollments, attendance, payments,
-- certificates, etc.) are intentionally NOT modeled yet.
--
-- Written in plain, portable SQL (no SQLite-only syntax beyond
-- AUTOINCREMENT/TEXT typing) so the same shape maps directly onto a
-- PostgreSQL schema later; see src/lib/db/client.js for the swap point.

CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  email              TEXT NOT NULL UNIQUE,
  phone              TEXT,
  password_hash      TEXT NOT NULL,
  role               TEXT NOT NULL DEFAULT 'STUDENT',
  status             TEXT NOT NULL DEFAULT 'ACTIVE',
  email_verified_at  TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- One row per active login. The browser cookie only ever holds an opaque
-- random token; token_hash (sha256 of that token) is what's stored here,
-- so a stolen database export can't be replayed as a live session.
-- Deleting a row (or letting it pass expires_at) invalidates that session
-- server-side — required for real logout, not just a client-side flag.
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- Forgot/reset-password flow. token_hash stores sha256(token) — the raw
-- token is only ever placed in the reset URL and never persisted in
-- plaintext. Single-use: used_at is set the moment a reset succeeds and
-- the token is rejected afterwards even if replayed before expires_at.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);

-- --------------------------------------------------------------------------
-- Student LMS foundation (Phase 8.1)
--
-- Only what's needed for a student profile + enrollment records + a
-- progress foundation. Assignments, attendance, payments, certificates,
-- notifications and live-class integration are NOT modeled here — later
-- phases.
--
-- Course/batch catalog reference strategy: courses and batches still live
-- in src/data/courses.js and src/data/batches.js (file-based, not in
-- SQLite). Rather than duplicating course/batch fields into the database,
-- enrollment rows store only the STABLE identifier already used to look
-- those records up elsewhere in the app — `course_slug` (matches
-- courses.js's `slug`) and `batch_id` (matches batches.js's `id`), exactly
-- how batches.js already references courses.js. These are therefore NOT
-- SQL foreign keys (there is no courses/batches table to reference) —
-- validity is checked in the application layer by looking the slug/id up
-- in the data file before it's ever displayed or trusted. This keeps the
-- large, frequently-edited course/batch catalog out of migrations
-- entirely, at the cost of the database not being able to enforce
-- referential integrity on those two columns by itself.
-- --------------------------------------------------------------------------

-- One row per user with the STUDENT role. Kept separate from `users` (per
-- "keep User authentication separate from student-domain data") — auth
-- fields (name/email/password/role) stay in `users` and are never
-- duplicated here. UNIQUE(user_id) is what makes "a user must not have
-- multiple StudentProfile records" an enforced constraint, not just a
-- convention.
CREATE TABLE IF NOT EXISTS student_profiles (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  phone       TEXT,
  city        TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A student's relationship to a course from the file-based catalog. See
-- the note above on why course_slug is not a SQL foreign key.
-- UNIQUE(student_id, course_slug) prevents a duplicate enrollment row for
-- the same course.
CREATE TABLE IF NOT EXISTS course_enrollments (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
  course_slug   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE',
  enrolled_at   TEXT NOT NULL DEFAULT (datetime('now')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, course_slug)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments (student_id);

-- A student's relationship to a specific batch from the file-based
-- schedule. See the note above on why batch_id is not a SQL foreign key.
CREATE TABLE IF NOT EXISTS batch_enrollments (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
  batch_id      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE',
  enrolled_at   TEXT NOT NULL DEFAULT (datetime('now')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_enrollments_student_id ON batch_enrollments (student_id);

-- --------------------------------------------------------------------------
-- Lesson progress tracking (Phase 8.4)
--
-- Minimal persistence for "has this student completed this lesson" plus
-- "when did they last look at it" — nothing more. Curriculum itself is
-- still NOT duplicated here: a lesson is identified by (course_slug,
-- module_index, lesson_index), the same position-based scheme
-- src/lib/student/curriculum.js already derives from src/data/courses.js
-- (course_slug is, as elsewhere in this schema, not a SQL foreign key —
-- see the note above course_enrollments for why). Every write to this
-- table validates that triple against the live course data first
-- (src/lib/student/progressActions.js), so a row can only ever describe a
-- lesson that actually exists right now.
--
-- UNIQUE(student_id, course_slug, module_index, lesson_index) is what
-- makes "no duplicate progress rows for the same lesson" an enforced
-- constraint (not just app-level discipline), and is exactly what makes
-- repeated "Mark as Complete" clicks idempotent: the same INSERT ...
-- ON CONFLICT DO UPDATE always targets the one existing row.
--
-- `completed_at` is set once, the first time a lesson is completed, and
-- deliberately left untouched by later idempotent completions (see
-- src/lib/db/lessonProgress.js) — it records "when this was first
-- finished", not "when it was last touched".
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
  id                TEXT PRIMARY KEY,
  student_id        TEXT NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
  course_slug       TEXT NOT NULL,
  module_index      INTEGER NOT NULL,
  lesson_index      INTEGER NOT NULL,
  completed         INTEGER NOT NULL DEFAULT 0,
  completed_at      TEXT,
  last_accessed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, course_slug, module_index, lesson_index)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_course ON lesson_progress (student_id, course_slug);

-- --------------------------------------------------------------------------
-- Class sessions (Phase 8.5)
--
-- Minimal, future-compatible model for a single scheduled live class
-- belonging to a batch. Same non-FK reference strategy as everywhere else
-- in this schema: `batch_id` matches batches.js's `id` (file-based
-- catalog, not duplicated here) rather than being a SQL foreign key —
-- validity is checked in the application layer.
--
-- There is deliberately no trainer/admin authoring UI yet (out of scope
-- for Phase 8.5 — "Do not build trainer scheduling UI yet"), so this
-- table is expected to be empty in practice for now; the student-facing
-- schedule honestly shows "No class schedule has been published yet."
-- rather than inventing sessions to fill it. Rows can still be seeded
-- directly (e.g. by a future admin phase) without any migration, since
-- the shape already supports a real meeting URL, location, and status.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_sessions (
  id            TEXT PRIMARY KEY,
  batch_id      TEXT NOT NULL,
  title         TEXT NOT NULL,
  session_date  TEXT NOT NULL,  -- 'YYYY-MM-DD'
  start_time    TEXT NOT NULL,  -- 'HH:MM' (24-hour, batch-local)
  end_time      TEXT NOT NULL,  -- 'HH:MM'
  meeting_url   TEXT,           -- NULL until a real link exists — never fabricated
  location      TEXT,
  status        TEXT NOT NULL DEFAULT 'SCHEDULED',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_class_sessions_batch_id ON class_sessions (batch_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON class_sessions (session_date, start_time);

-- --------------------------------------------------------------------------
-- Assignments + submissions (Phase 8.6)
--
-- `assignments.course_slug`/`batch_id` follow the same non-FK,
-- validated-in-the-application-layer reference strategy as everywhere
-- else in this schema (course_slug matches src/data/courses.js, batch_id
-- matches src/data/batches.js; batch_id is nullable — a course-wide
-- assignment has no specific batch). There is deliberately no
-- trainer/admin authoring UI yet ("Do not build admin assignment
-- management"), so this table is expected to be empty in practice; the
-- student-facing list honestly shows an empty state rather than inventing
-- assignments.
--
-- `assignment_submissions.assignment_id` IS a real SQL foreign key (unlike
-- the course/batch references above) — assignments are native database
-- rows here, not file-based catalog data, so referential integrity can
-- and should be enforced.
--
-- No grading fields (score, feedback, graded_by, etc.) are added — out of
-- scope for this phase ("Do not create grading fields unless needed";
-- "Do not build trainer grading dashboard"). `status` on a submission
-- exists so a future grading phase has somewhere to record REVIEWED /
-- RETURNED without a migration; nothing in this phase ever sets it to
-- anything but SUBMITTED.
--
-- UNIQUE(assignment_id, student_id) makes "one submission per student per
-- assignment" an enforced constraint — resubmitting updates the same row
-- (see src/lib/db/assignmentSubmissions.js) rather than creating a second
-- one, which is the explicit, documented resubmission behavior this phase
-- implements (spec section 7: "keep behavior explicit").
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
  id            TEXT PRIMARY KEY,
  course_slug   TEXT NOT NULL,
  batch_id      TEXT,
  title         TEXT NOT NULL,
  description   TEXT,
  due_at        TEXT,
  status        TEXT NOT NULL DEFAULT 'DRAFT',
  -- Phase 9.4: authoring trainer. Nullable — rows created before this
  -- column existed (and any non-trainer-authored row) have NULL. Existing
  -- databases get the column via the guarded migration in
  -- src/lib/db/client.js (CREATE TABLE IF NOT EXISTS never alters an
  -- existing table).
  created_by    TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assignments_course_slug ON assignments (course_slug);
CREATE INDEX IF NOT EXISTS idx_assignments_batch_id ON assignments (batch_id);

-- `score`/`feedback`/`evaluated_at` (Phase 9.2): the smallest possible
-- addition for trainer evaluation, per the audit that found `status`
-- already anticipated this ("status exists so a future grading phase has
-- somewhere to record REVIEWED / RETURNED without a migration" — see the
-- comment above this table). No separate "evaluations" or
-- "trainer_feedback" table was created — this IS the one source of truth
-- a trainer writes to and a student's existing assignment page reads
-- from. `score` is a plain nullable integer (0-100), not a full grading
-- rubric — deliberately minimal, no weighting/rubric system was invented.
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id                TEXT PRIMARY KEY,
  assignment_id     TEXT NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  student_id        TEXT NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
  submission_text   TEXT,
  file_url          TEXT,
  submitted_at      TEXT NOT NULL DEFAULT (datetime('now')),
  status            TEXT NOT NULL DEFAULT 'SUBMITTED',
  score             INTEGER,
  feedback          TEXT,
  evaluated_at      TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions (student_id);

-- --------------------------------------------------------------------------
-- Attendance + certificates (Phase 8.7)
--
-- `attendance_records.batch_id` follows the same non-FK catalog-reference
-- strategy as the rest of this schema (matches src/data/batches.js).
-- `class_session_id` IS a real SQL foreign key — class_sessions is a
-- native DB table (Phase 8.5), not file-based catalog data — and is
-- nullable because not every attendance record necessarily traces back to
-- a specific scheduled session in this minimal model. ON DELETE SET NULL
-- means a later-removed session doesn't destroy the attendance history
-- that referenced it.
--
-- UNIQUE(student_id, class_session_id) is the practical duplicate-prevention
-- rule the spec asks for: a student can only have one attendance record
-- per real class session. SQLite treats NULLs as distinct for UNIQUE
-- purposes, so this doesn't (and isn't meant to) constrain
-- session-less records — there is no write path that creates those in
-- this phase (no trainer marking UI exists yet — explicitly out of
-- scope), so the table is expected to be empty in practice.
--
-- There is deliberately no attendance-marking UI, so nothing here ever
-- writes a row; the student-facing page honestly shows "No attendance
-- records available yet." rather than a fabricated percentage.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
  id                TEXT PRIMARY KEY,
  student_id        TEXT NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
  batch_id          TEXT NOT NULL,
  class_session_id  TEXT REFERENCES class_sessions (id) ON DELETE SET NULL,
  status            TEXT NOT NULL,
  marked_at         TEXT NOT NULL DEFAULT (datetime('now')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, class_session_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records (student_id);

-- Minimal certificate record. `course_slug` is the same non-FK catalog
-- reference used throughout (matches src/data/courses.js).
-- `certificate_number` is UNIQUE — a human-shareable, verifiable
-- identifier distinct from the internal `id`.
--
-- Nothing in this application ever inserts a row here automatically —
-- Phase 8.4's course-completion check explicitly stops short of issuing a
-- certificate ("Course learning content completed", no certificate), and
-- no admin/trainer issuance workflow exists yet ("Do not automatically
-- issue certificates" / "Do not build admin certificate management").
-- This table is expected to be empty in practice; createCertificate()
-- below is only a tested foundation for that future phase.
CREATE TABLE IF NOT EXISTS certificates (
  id                  TEXT PRIMARY KEY,
  student_id          TEXT NOT NULL REFERENCES student_profiles (id) ON DELETE CASCADE,
  course_slug         TEXT NOT NULL,
  certificate_number  TEXT NOT NULL UNIQUE,
  issued_at           TEXT NOT NULL DEFAULT (datetime('now')),
  status              TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates (student_id);

-- --------------------------------------------------------------------------
-- Notifications (Phase 8.8)
--
-- `user_id` references `users` directly (not `student_profiles`) because
-- notifications are a user-level concern that could reach any role in a
-- later phase, not something inherently student-only — the student UI
-- just happens to be the only reader of them right now.
--
-- Nothing in this application inserts a row here automatically ("Do not
-- build notification automation" — only the foundation + UI). The table
-- is expected to be empty in practice; createNotification() below is only
-- a tested foundation for a future phase (a trainer/admin action, or a
-- real automated trigger) to build on.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'GENERAL',
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);

-- --------------------------------------------------------------------------
-- Trainer foundation (Phase 9.1)
--
-- Audited first: no existing relationship (no trainer_id/trainer_user_id
-- column anywhere in this schema, no join table) currently connects a
-- TRAINER user to a batch, so per the spec's "if no relationship exists,
-- create the smallest clean solution" this is a new, minimal join table —
-- not a duplicate of course/batch/enrollment data.
--
-- `trainer_user_id` references `users` directly (a trainer has no
-- separate profile table the way a student does — there was no existing
-- `trainer_profiles` table to hang this off of, and nothing in this phase
-- needs one). `batch_id` follows the same non-FK catalog-reference
-- strategy as the rest of this schema (matches src/data/batches.js) — it
-- is not a SQL foreign key because batches are file-based, not a native
-- DB table; validity is checked in the application layer.
--
-- UNIQUE(trainer_user_id, batch_id) prevents a duplicate assignment row
-- for the same trainer+batch pair, while still allowing MULTIPLE trainers
-- to be assigned to the same batch (no uniqueness on batch_id alone) and
-- one trainer to be assigned to multiple batches.
--
-- There is deliberately no admin authoring UI yet to create these rows
-- (out of scope for this phase — "Do not build admin panel"), so this
-- table is expected to be empty by default; every trainer page honestly
-- shows "No batches assigned yet." rather than fabricating an assignment.
-- Rows can still be seeded directly (e.g. by a future admin phase, or a
-- one-off script) without any migration.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trainer_batch_assignments (
  id                TEXT PRIMARY KEY,
  trainer_user_id   TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  batch_id          TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (trainer_user_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_trainer_batch_assignments_trainer_id ON trainer_batch_assignments (trainer_user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_batch_assignments_batch_id ON trainer_batch_assignments (batch_id);

-- --------------------------------------------------------------------------
-- CRM leads + internal notes (Phase 10.2)
--
-- ONE table for every public enquiry (`source` distinguishes the Book Demo
-- form from the Enquiry form; `origin` is the page tag the form already
-- carries). No UNIQUE on phone/email: the same person may legitimately
-- enquire more than once — accidental double-submits are collapsed at the
-- service layer instead (src/lib/crm/submit.js). `course_slug` / `mode` /
-- `batch_id` follow this schema's non-FK catalog-reference convention
-- (src/data/*) and are validated against the live catalog on write.
-- `status` and `source` are validated in code against src/constants/crm.js;
-- the browser can never choose a status. Both tables are new, so existing
-- databases pick them up via CREATE TABLE IF NOT EXISTS with no data
-- touched. lead_notes are internal staff notes and are never shown outside
-- the CRM.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  phone              TEXT NOT NULL,
  email              TEXT NOT NULL,
  organization       TEXT,
  city               TEXT,
  experience_level   TEXT,
  course_slug        TEXT,
  mode               TEXT,
  batch_id           TEXT,
  message            TEXT,
  source             TEXT NOT NULL,
  origin             TEXT,
  consent            INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'NEW',
  assigned_to        TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  last_contacted_at  TEXT,
  -- Phase 10.3: set when the lead is converted to a student account. Existing
  -- databases get these via the guarded migration in src/lib/db/client.js.
  converted_user_id  TEXT REFERENCES users (id) ON DELETE SET NULL,
  converted_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);

CREATE TABLE IF NOT EXISTS lead_notes (
  id              TEXT PRIMARY KEY,
  lead_id         TEXT NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  author_user_id  TEXT REFERENCES users (id) ON DELETE SET NULL,
  note            TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes (lead_id);

-- --------------------------------------------------------------------------
-- Fees, payments and audit trail (Phase 10.4)
--
-- Course prices do not exist anywhere in this app, so nothing is inferred:
-- a fee plan is an amount a staff member explicitly assigns to ONE real
-- enrollment (batch_enrollments row). All money is stored as INTEGER minor
-- units (paise/cents) with an explicit currency — never floats.
--
-- fee_plans: UNIQUE(enrollment_id) = at most one plan per enrollment (edit
-- it instead of stacking plans). Net payable = total_minor - discount_minor.
-- The payment *status* (pending / partially paid / paid / overdue) is
-- derived from the plan and its payments, never stored, so it can't drift.
--
-- payments: append-only history. A mistaken entry is VOIDED (with reason and
-- actor) rather than deleted. Only RECORDED (manual, staff-entered) and
-- VERIFIED (gateway-confirmed) rows count toward "paid". `source` makes a
-- manual entry distinguishable from a gateway-verified one. receipt_token is
-- the unguessable identifier used in receipt URLs; receipt_number is the
-- human-readable number. UNIQUE(provider, provider_reference) and
-- idempotency_key prevent the same provider transaction being recorded twice.
--
-- payment_provider_events: dedupe table for future gateway webhooks
-- (UNIQUE(provider, event_id)). No gateway is configured yet.
--
-- audit_log: minimal who/what/when record for financial mutations (detail is
-- a short JSON string of non-secret fields only).
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_plans (
  id                TEXT PRIMARY KEY,
  enrollment_id     TEXT NOT NULL UNIQUE REFERENCES batch_enrollments (id) ON DELETE RESTRICT,
  student_user_id   TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  course_slug       TEXT NOT NULL,
  batch_id          TEXT NOT NULL,
  currency          TEXT NOT NULL,
  total_minor       INTEGER NOT NULL CHECK (total_minor >= 0),
  discount_minor    INTEGER NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  due_date          TEXT,
  status            TEXT NOT NULL DEFAULT 'ACTIVE',
  note              TEXT,
  created_by        TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (discount_minor <= total_minor)
);

CREATE INDEX IF NOT EXISTS idx_fee_plans_student_user_id ON fee_plans (student_user_id);
CREATE INDEX IF NOT EXISTS idx_fee_plans_course_slug ON fee_plans (course_slug);

CREATE TABLE IF NOT EXISTS payments (
  id                  TEXT PRIMARY KEY,
  fee_plan_id         TEXT NOT NULL REFERENCES fee_plans (id) ON DELETE RESTRICT,
  amount_minor        INTEGER NOT NULL CHECK (amount_minor > 0),
  currency            TEXT NOT NULL,
  source              TEXT NOT NULL,
  method              TEXT NOT NULL,
  provider            TEXT,
  provider_reference  TEXT,
  idempotency_key     TEXT UNIQUE,
  status              TEXT NOT NULL,
  paid_on             TEXT NOT NULL,
  note                TEXT,
  recorded_by         TEXT REFERENCES users (id) ON DELETE SET NULL,
  verified_at         TEXT,
  voided_at           TEXT,
  void_reason         TEXT,
  voided_by           TEXT REFERENCES users (id) ON DELETE SET NULL,
  receipt_number      TEXT NOT NULL UNIQUE,
  receipt_token       TEXT NOT NULL UNIQUE,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_fee_plan_id ON payments (fee_plan_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_reference
  ON payments (provider, provider_reference) WHERE provider IS NOT NULL AND provider_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_provider_events (
  id           TEXT PRIMARY KEY,
  provider     TEXT NOT NULL,
  event_id     TEXT NOT NULL,
  received_at  TEXT NOT NULL DEFAULT (datetime('now')),
  outcome      TEXT,
  UNIQUE (provider, event_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id             TEXT PRIMARY KEY,
  actor_user_id  TEXT REFERENCES users (id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      TEXT NOT NULL,
  detail         TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
