"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { COURSE_STATUS_LABELS } from "@/constants/catalog";
import { slugify } from "@/lib/validateCatalog";
import {
  createCourseAction,
  updateCourseAction,
  setCourseStatusAction,
  createBatchAction,
  updateBatchAction,
  setBatchStatusAction,
  assignTrainerAction,
  removeTrainerAction,
} from "@/lib/admin/catalogActions";

function Submit({ children, variant = "primary" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} loading={pending} disabled={pending}>
      {children}
    </Button>
  );
}

function Feedback({ state }) {
  return (
    <>
      {state.status === "error" && state.formError && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.formError}
        </p>
      )}
      {state.status === "error" && !state.formError && Object.keys(state.errors ?? {}).length > 0 && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          Please fix the highlighted fields.
        </p>
      )}
      {state.status === "success" && state.message && (
        <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success">
          {state.message}
        </p>
      )}
    </>
  );
}

// A form is re-mounted whenever the server echoes new values back, so every
// field starts from exactly what was submitted (React 19 otherwise resets
// uncontrolled fields to the first-mounted values after a failed action).
const formKey = (values) => (values ? JSON.stringify(values) : "initial");

const list = (items) => (Array.isArray(items) ? items.join("\n") : items ?? "");

// ----------------------------------------------------------------- course

/**
 * Create / edit a course. `initial` is the current merged course (edit) or
 * undefined (create). The slug is chosen once at creation and is read-only after.
 */
export function CourseForm({ mode, options, initial }) {
  const isEdit = mode === "edit";
  const [state, formAction] = useActionState(isEdit ? updateCourseAction : createCourseAction, { status: "idle", errors: {} });
  const v = state.values ?? {
    slug: initial?.slug ?? "",
    title: initial?.title ?? "",
    shortDescription: initial?.shortDescription ?? "",
    description: initial?.description ?? "",
    categorySlug: initial?.categorySlug ?? "",
    level: initial?.level ?? "",
    duration: initial?.duration ?? "",
    durationBand: initial?.durationBand ?? "",
    modes: initial?.modes ?? [],
    technologies: (initial?.technologies ?? []).join(", "),
    prerequisites: list(initial?.prerequisites),
    outcomes: list(initial?.outcomes),
    status: "UNPUBLISHED",
  };
  const e = state.errors ?? {};
  return <CourseFormBody key={formKey(state.values)} isEdit={isEdit} state={state} formAction={formAction} v={v} e={e} options={options} />;
}

function CourseFormBody({ isEdit, state, formAction, v, e, options }) {
  const [title, setTitle] = useState(v.title);
  const [slug, setSlug] = useState(v.slug);
  const slugTouched = useRef(Boolean(v.slug));
  const modes = Array.isArray(v.modes) ? v.modes : [];

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Feedback state={state} />
      {isEdit && <input type="hidden" name="slug" value={v.slug} />}

      <Input
        label="Title"
        id="title"
        name="title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          if (!isEdit && !slugTouched.current) setSlug(slugify(event.target.value));
        }}
        error={e.title}
        maxLength={120}
        required
      />

      {isEdit ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">URL name</span>
          <p className="text-sm text-muted">
            /courses/{v.slug} <span className="text-xs">(fixed — enrollments and certificates refer to it)</span>
          </p>
        </div>
      ) : (
        <Input
          label="URL name (slug)"
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => {
            slugTouched.current = true;
            setSlug(event.target.value);
          }}
          error={e.slug}
          maxLength={60}
          required
        />
      )}

      <Input label="Short summary" id="shortDescription" name="shortDescription" defaultValue={v.shortDescription} error={e.shortDescription} maxLength={220} required />
      <Textarea label="Description" id="description" name="description" rows={5} defaultValue={v.description} error={e.description} maxLength={2100} required />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Category" id="categorySlug" name="categorySlug" defaultValue={v.categorySlug} error={e.categorySlug} required>
          <option value="" disabled>
            Select a category
          </option>
          {options.categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select label="Level" id="level" name="level" defaultValue={v.level} error={e.level} required>
          <option value="" disabled>
            Select a level
          </option>
          {options.levels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        <Input label="Duration" id="duration" name="duration" defaultValue={v.duration} error={e.duration} placeholder="e.g. 3 Months" maxLength={70} required />
        <Select label="Duration band" id="durationBand" name="durationBand" defaultValue={v.durationBand} error={e.durationBand} required>
          <option value="" disabled>
            Select a band
          </option>
          {options.durationBands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">Learning modes</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {options.modes.map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" name="modes" value={m} defaultChecked={modes.includes(m)} className="h-4 w-4 rounded border-border" />
              {m}
            </label>
          ))}
        </div>
        {e.modes && <p className="text-sm text-danger">{e.modes}</p>}
      </fieldset>

      <Input label="Technologies (comma separated)" id="technologies" name="technologies" defaultValue={v.technologies} error={e.technologies} />
      <Textarea label="Prerequisites (one per line)" id="prerequisites" name="prerequisites" rows={3} defaultValue={v.prerequisites} error={e.prerequisites} />
      <Textarea label="What students will learn (one per line)" id="outcomes" name="outcomes" rows={4} defaultValue={v.outcomes} error={e.outcomes} />

      {!isEdit && (
        <Select label="Status" id="status" name="status" defaultValue={v.status || "UNPUBLISHED"}>
          <option value="UNPUBLISHED">Unpublished (draft — not visible to the public)</option>
          <option value="PUBLISHED">Published (visible on the public site)</option>
        </Select>
      )}

      <p className="text-xs text-muted">
        Fees are set per enrollment, not per course. Syllabus modules, projects and FAQs are part of the course content files and aren&apos;t edited here.
      </p>
      <div>
        <Submit>{isEdit ? "Save changes" : "Create course"}</Submit>
      </div>
    </form>
  );
}

export function CourseStatusForm({ slug, status, activeEnrollments }) {
  const [state, formAction] = useActionState(setCourseStatusAction, { status: "idle" });
  const published = status === "PUBLISHED";
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="status" value={published ? "UNPUBLISHED" : "PUBLISHED"} />
      <Feedback state={state} />
      <p className="text-sm text-muted">
        Currently <strong className="text-dark">{COURSE_STATUS_LABELS[status]}</strong>.{" "}
        {published
          ? "Unpublishing hides the course (and its batches) from the public site and from new enrollments. Existing students, fees and certificates are not affected."
          : "Publishing makes the course and its open batches visible on the public site."}
      </p>
      <div>
        {published ? (
          <ConfirmButton
            title="Unpublish this course?"
            message={`It will disappear from the public catalog and can't take new enrollments. ${activeEnrollments} active enrollment(s) keep their access.`}
            confirmLabel="Unpublish course"
          >
            Unpublish course
          </ConfirmButton>
        ) : (
          <ConfirmButton needsConfirm={false} variant="primary">
            Publish course
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ batch

/** Create / edit a batch. In edit mode the course is fixed and shown as text. */
export function BatchForm({ mode, options, initial, presetCourse = "" }) {
  const isEdit = mode === "edit";
  const [state, formAction] = useActionState(isEdit ? updateBatchAction : createBatchAction, { status: "idle", errors: {} });
  const v = state.values ?? {
    batchId: initial?.id ?? "",
    courseSlug: initial?.courseSlug ?? presetCourse,
    mode: initial?.mode ?? "",
    schedule: initial?.schedule ?? "",
    startsOn: initial?.startsOn ?? "",
    endsOn: initial?.endsOn ?? "",
    status: initial?.status ?? "Upcoming",
    location: initial?.location ?? "",
  };
  return <BatchFormBody key={formKey(state.values)} isEdit={isEdit} state={state} formAction={formAction} v={v} e={state.errors ?? {}} options={options} courseTitle={initial?.courseTitle} />;
}

function BatchFormBody({ isEdit, state, formAction, v, e, options, courseTitle }) {
  const [course, setCourse] = useState(v.courseSlug);
  const supported = options.courses.find((c) => c.value === course)?.modes ?? options.modes;
  const modeChoices = options.modes.filter((m) => supported.includes(m) || m === v.mode);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Feedback state={state} />
      {isEdit && <input type="hidden" name="batchId" value={v.batchId} />}

      {isEdit ? (
        <>
          <input type="hidden" name="courseSlug" value={v.courseSlug} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Course</span>
            <p className="text-sm text-dark">
              {courseTitle} <span className="text-xs text-muted">(fixed — enrollments and fees refer to this batch)</span>
            </p>
          </div>
        </>
      ) : (
        <Select label="Course" id="courseSlug" name="courseSlug" value={course} onChange={(event) => setCourse(event.target.value)} error={e.courseSlug} required>
          <option value="" disabled>
            Select a course
          </option>
          {options.courses.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Mode" id="mode" name="mode" defaultValue={v.mode} error={e.mode} required>
          <option value="" disabled>
            Select a mode
          </option>
          {modeChoices.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select label="Status" id="status" name="status" defaultValue={v.status} error={e.status} required>
          {options.statuses
            .filter((s) => isEdit || s !== "Archived")
            .map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
        </Select>
        <Input label="Start date" id="startsOn" name="startsOn" type="date" defaultValue={v.startsOn} error={e.startsOn} required />
        <Input label="End date (optional)" id="endsOn" name="endsOn" type="date" defaultValue={v.endsOn ?? ""} error={e.endsOn} />
      </div>

      <Input label="Schedule" id="schedule" name="schedule" defaultValue={v.schedule} error={e.schedule} placeholder="e.g. Mon – Fri • 7:00 PM" maxLength={90} required />
      <Input label="Location (optional)" id="location" name="location" defaultValue={v.location} error={e.location} placeholder="Defaults from the mode" maxLength={130} />

      <p className="text-xs text-muted">
        Only Open and Upcoming batches of published courses are shown publicly and can take new enrollments. Seat capacity isn&apos;t tracked.
      </p>
      <div>
        <Submit>{isEdit ? "Save changes" : "Create batch"}</Submit>
      </div>
    </form>
  );
}

const CONFIRM_STATUSES = ["Closed", "Completed", "Archived"];

export function BatchStatusForm({ batchId, status, statuses, activeEnrollments }) {
  const [state, formAction] = useActionState(setBatchStatusAction, { status: "idle" });
  const [next, setNext] = useState(status);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="batchId" value={batchId} />
      <Feedback state={state} />
      <Select label="Status" id="batch-status" name="status" value={next} onChange={(event) => setNext(event.target.value)}>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <div>
        <ConfirmButton
          needsConfirm={next !== status && CONFIRM_STATUSES.includes(next)}
          title={`Set this batch to ${next}?`}
          message={
            next === "Archived"
              ? "An archived batch is hidden everywhere except this admin page. Enrollment history is kept. It can only be archived when no enrollment is active."
              : `${next} batches stop taking new enrollments and leave the public site. ${activeEnrollments} active enrollment(s) are not changed.`
          }
          confirmLabel={`Set to ${next}`}
          variant="outline"
        >
          Update status
        </ConfirmButton>
      </div>
    </form>
  );
}

export function TrainerAssignForm({ batchId, trainers }) {
  const [state, formAction] = useActionState(assignTrainerAction, { status: "idle" });
  if (trainers.length === 0) {
    return <p className="text-sm text-muted">Every active trainer is already assigned to this batch, or no active trainers exist.</p>;
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="batchId" value={batchId} />
      <Feedback state={state} />
      <Select label="Assign a trainer" id="trainerId" name="trainerId" defaultValue="" required>
        <option value="" disabled>
          Select a trainer…
        </option>
        {trainers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.email})
          </option>
        ))}
      </Select>
      <div>
        <Submit variant="outline">Assign trainer</Submit>
      </div>
    </form>
  );
}

/**
 * The assigned-trainers list. One shared action state lives here (not in each row)
 * so the "removed" confirmation is still on screen after the row itself is gone.
 */
export function TrainerList({ batchId, trainers, children }) {
  const [state, formAction] = useActionState(removeTrainerAction, { status: "idle" });
  return (
    <div className="flex flex-col gap-3">
      <Feedback state={state} />
      {trainers.length === 0 ? (
        <p className="text-sm text-muted">No trainer is assigned to this batch yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border text-sm">
          {trainers.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <Link href={`/admin/trainers/${t.id}`} className="font-medium text-dark hover:text-primary">
                  {t.name}
                </Link>
                <p className="truncate text-xs text-muted">{t.detail}</p>
              </div>
              <form action={formAction}>
                <input type="hidden" name="batchId" value={batchId} />
                <input type="hidden" name="trainerId" value={t.id} />
                <ConfirmButton
                  title="Remove this trainer?"
                  message={`${t.name} will lose access to this batch's students, classes and attendance. Existing class, attendance and assignment records are kept.`}
                  confirmLabel="Remove trainer"
                >
                  Remove
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}
