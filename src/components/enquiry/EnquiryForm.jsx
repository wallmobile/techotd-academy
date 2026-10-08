"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EnquirySuccess } from "@/components/enquiry/EnquirySuccess";
import { courses } from "@/data/courses";
import { trainingModes } from "@/data/trainingModes";
import { batches } from "@/data/batches";
import { LEVELS } from "@/data/courseFilters";
import { submitEnquiry, normalizeSource } from "@/lib/enquiry";
import { validateEnquiryForm, MESSAGE_MAX_LENGTH } from "@/lib/validateEnquiry";
import { cn } from "@/lib/utils";

const EMPTY_VALUES = {
  name: "",
  phone: "",
  email: "",
  city: "",
  course: "",
  mode: "",
  batch: "",
  experienceLevel: "",
  organization: "",
  message: "",
  consent: false,
};

const svg = {
  viewBox: "0 0 20 20",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
const icons = {
  user: (
    <svg {...svg}>
      <circle cx="10" cy="7" r="3.2" />
      <path d="M3.5 17c.8-3 3.4-4.6 6.5-4.6s5.7 1.6 6.5 4.6" />
    </svg>
  ),
  phone: (
    <svg {...svg}>
      <path d="M5 3h3l1.4 3.6-1.8 1.2a9 9 0 004.6 4.6l1.2-1.8L17 12v3a2 2 0 01-2 2A12 12 0 013 5a2 2 0 012-2z" />
    </svg>
  ),
  mail: (
    <svg {...svg}>
      <rect x="2.5" y="4" width="15" height="12" rx="2.5" />
      <path d="M3 6l7 5 7-5" />
    </svg>
  ),
  pin: (
    <svg {...svg}>
      <path d="M10 18s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" />
      <circle cx="10" cy="8" r="2" />
    </svg>
  ),
  book: (
    <svg {...svg}>
      <path d="M10 5c-1.5-1-4-1.3-6-1v11c2-.3 4.5 0 6 1 1.5-1 4-1.3 6-1V4c-2-.3-4.5 0-6 1zM10 5v11" />
    </svg>
  ),
  level: (
    <svg {...svg}>
      <path d="M4 16V11M10 16V7M16 16V3" />
    </svg>
  ),
  building: (
    <svg {...svg}>
      <path d="M3 17V7l7-4 7 4v10M3 17h14M8 17v-4h4v4" />
    </svg>
  ),
  calendar: (
    <svg {...svg}>
      <rect x="3" y="4.5" width="14" height="12" rx="2" />
      <path d="M3 8.5h14M7 3v3M13 3v3" />
    </svg>
  ),
};

// Compact, consistent control styling for every field in the form.
const FIELD_STYLES = [
  "[&_label]:text-[13px] [&_label]:font-medium [&_label]:text-dark",
  "[&_input:not([type=checkbox])]:h-11 [&_input:not([type=checkbox])]:rounded-xl [&_input:not([type=checkbox])]:border-border [&_input:not([type=checkbox])]:bg-surface/70 [&_input:not([type=checkbox])]:text-[13px] [&_input:not([type=checkbox])]:transition-all [&_input:not([type=checkbox])]:hover:border-primary/40 [&_input:not([type=checkbox])]:focus:border-primary [&_input:not([type=checkbox])]:focus:bg-white [&_input:not([type=checkbox])]:focus:ring-4 [&_input:not([type=checkbox])]:focus:ring-primary/10",
  "[&_select]:h-11 [&_select]:rounded-xl [&_select]:border-border [&_select]:bg-surface/70 [&_select]:text-[13px] [&_select]:transition-all [&_select]:hover:border-primary/40 [&_select]:focus:border-primary [&_select]:focus:bg-white [&_select]:focus:ring-4 [&_select]:focus:ring-primary/10",
  "[&_textarea]:rounded-xl [&_textarea]:border-border [&_textarea]:bg-surface/70 [&_textarea]:text-[13px] [&_textarea]:transition-all [&_textarea]:hover:border-primary/40 [&_textarea]:focus:border-primary [&_textarea]:focus:bg-white [&_textarea]:focus:ring-4 [&_textarea]:focus:ring-primary/10",
].join(" ");

// Staggered entrance for each block of the form.
const rise = (index) => ({
  className: "animate-fade-up-in",
  style: { animationDelay: `${150 + index * 70}ms` },
});

/**
 * Shared form for /book-demo and /enquiry. `variant` decides which
 * optional fields render; both call the same submitEnquiry() boundary, which now persists a lead.
 */
export function EnquiryForm({ variant, initialCourse, initialMode, initialBatch, source }) {
  const [values, setValues] = useState({
    ...EMPTY_VALUES,
    course: initialCourse || "",
    mode: initialMode || "",
    batch: initialBatch || "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success
  const [submittedName, setSubmittedName] = useState("");

  const availableBatches = useMemo(
    () => (values.course ? batches.filter((batch) => batch.courseSlug === values.course) : batches),
    [values.course]
  );

  // Progress meter over the required fields only.
  const required = [
    values.name.trim(),
    values.phone.trim(),
    values.email.trim(),
    values.consent,
    ...(values.mode === "corporate" ? [values.organization.trim()] : []),
  ];
  const done = required.filter(Boolean).length;
  const percent = Math.round((done / required.length) * 100);

  function updateField(field, value) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // If the course changes, drop a previously-selected batch that no
      // longer belongs to it rather than silently keeping a mismatch.
      if (field === "course") {
        const stillValid = batches.some(
          (batch) => batch.id === prev.batch && batch.courseSlug === value
        );
        if (!stillValid) next.batch = "";
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateEnquiryForm(values, variant);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("submitting");

    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      city: values.city.trim() || undefined,
      interestedCourse: values.course || undefined,
      preferredMode: values.mode || undefined,
      preferredBatch: variant === "book-demo" ? values.batch || undefined : undefined,
      experienceLevel: variant === "enquiry" ? values.experienceLevel || undefined : undefined,
      organization: values.mode === "corporate" ? values.organization.trim() || undefined : undefined,
      message: values.message.trim() || undefined,
      source: normalizeSource(source),
      consent: values.consent,
    };

    const result = await submitEnquiry(payload, variant);

    if (result.ok) {
      setSubmittedName(payload.name);
      setStatus("success");
    } else {
      setStatus("idle");
      setErrors({ form: result.error || "Something went wrong. Please try again." });
    }
  }

  function handleReset() {
    setValues({ ...EMPTY_VALUES });
    setErrors({});
    setStatus("idle");
  }

  if (status === "success") {
    return <EnquirySuccess name={submittedName} onReset={handleReset} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={cn("flex flex-col gap-4", FIELD_STYLES)}>
      {/* header + progress */}
      <div {...rise(0)}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-dark">
              {variant === "book-demo" ? "Reserve your session" : "Send your enquiry"}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">Takes about a minute. Fields marked * are required.</p>
          </div>
          <p
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-500",
              percent === 100 ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
            )}
            aria-live="polite"
          >
            {percent === 100 ? "✓ Ready to submit" : `${done}/${required.length} done`}
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Form completion">
          <div
            className="animate-gradient-x relative h-full rounded-full bg-linear-to-r from-primary via-secondary to-primary transition-all duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {errors.form && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-[13px] text-danger">
          {errors.form}
        </p>
      )}

      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", rise(1).className)} style={rise(1).style}>
        <Input
          label="Full Name *"
          name="name"
          icon={icons.user}
          autoComplete="name"
          placeholder="Your name"
          value={values.name}
          onChange={(event) => updateField("name", event.target.value)}
          error={errors.name}
        />
        <Input
          label="Phone Number *"
          name="phone"
          type="tel"
          icon={icons.phone}
          autoComplete="tel"
          placeholder="98765 43210"
          value={values.phone}
          onChange={(event) => updateField("phone", event.target.value)}
          error={errors.phone}
        />
        <Input
          label="Email *"
          name="email"
          type="email"
          icon={icons.mail}
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          error={errors.email}
        />
        {variant === "enquiry" ? (
          <Input
            label="City"
            name="city"
            icon={icons.pin}
            autoComplete="address-level2"
            placeholder="Your city"
            value={values.city}
            onChange={(event) => updateField("city", event.target.value)}
          />
        ) : (
          <Select
            label="Course"
            name="course"
            icon={icons.book}
            value={values.course}
            onChange={(event) => updateField("course", event.target.value)}
          >
            <option value="">Not sure yet / General enquiry</option>
            {courses.map((course) => (
              <option key={course.slug} value={course.slug}>
                {course.title}
              </option>
            ))}
          </Select>
        )}

        {variant === "enquiry" && (
          <>
            <Select
              label="Interested Course"
              name="course"
              icon={icons.book}
              value={values.course}
              onChange={(event) => updateField("course", event.target.value)}
            >
              <option value="">Not sure yet / General enquiry</option>
              {courses.map((course) => (
                <option key={course.slug} value={course.slug}>
                  {course.title}
                </option>
              ))}
            </Select>
            <Select
              label="Experience Level"
              name="experienceLevel"
              icon={icons.level}
              value={values.experienceLevel}
              onChange={(event) => updateField("experienceLevel", event.target.value)}
            >
              <option value="">Not sure</option>
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </>
        )}
      </div>

      {/* learning mode chips */}
      <fieldset {...rise(2)}>
        <legend className="text-[13px] font-medium text-dark">
          Preferred learning mode <span className="font-normal text-muted">(optional)</span>
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {trainingModes.map((trainingMode) => {
            const active = values.mode === trainingMode.slug;
            return (
              <button
                key={trainingMode.slug}
                type="button"
                aria-pressed={active}
                onClick={() => updateField("mode", active ? "" : trainingMode.slug)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                  active
                    ? "border-transparent bg-linear-to-r from-primary to-secondary text-white shadow-md shadow-primary/25"
                    : "border-border bg-surface/70 text-text hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
                )}
              >
                {active && (
                  <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" className="animate-pop-in" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                )}
                {trainingMode.shortTitle}
              </button>
            );
          })}
        </div>
      </fieldset>

      {values.mode === "corporate" && (
        <div className="animate-fade-up-in">
          <Input
            label="Organization / Company Name *"
            name="organization"
            icon={icons.building}
            autoComplete="organization"
            value={values.organization}
            onChange={(event) => updateField("organization", event.target.value)}
            error={errors.organization}
          />
        </div>
      )}

      {variant === "book-demo" && (
        <div {...rise(3)}>
        <Select
          label="Preferred Batch"
          name="batch"
          icon={icons.calendar}
          value={values.batch}
          onChange={(event) => updateField("batch", event.target.value)}
        >
          <option value="">No preference</option>
          {availableBatches.map((batch) => {
            const course = courses.find((c) => c.slug === batch.courseSlug);
            return (
              <option key={batch.id} value={batch.id}>
                {course
                  ? `${course.title} — ${batch.startDate} · ${batch.schedule} (${batch.mode})`
                  : batch.schedule}
              </option>
            );
          })}
        </Select>
        </div>
      )}

      <div {...rise(4)}>
      <Textarea
        label="Message"
        name="message"
        rows={3}
        placeholder="Anything you'd like us to know?"
        maxLength={MESSAGE_MAX_LENGTH}
        value={values.message}
        onChange={(event) => updateField("message", event.target.value)}
        error={errors.message}
      />
      </div>

      <div {...rise(5)}>
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-[13px] text-text transition-colors",
            values.consent ? "border-primary/40 bg-primary/5" : "border-border bg-surface/70 hover:border-primary/30",
            errors.consent && "border-danger"
          )}
        >
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(event) => updateField("consent", event.target.checked)}
            aria-invalid={Boolean(errors.consent) || undefined}
            aria-describedby={errors.consent ? "consent-error" : undefined}
            className="mt-0.5 h-4 w-4 rounded-sm border-border accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <span>I agree to be contacted about this request. *</span>
        </label>
        {errors.consent && (
          <p id="consent-error" className="mt-1.5 text-[13px] text-danger">
            {errors.consent}
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={status === "submitting"}
        loading={status === "submitting"}
        className="group relative h-12 w-full overflow-hidden rounded-xl bg-linear-to-r from-primary via-primary to-secondary text-sm font-semibold shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40"
      >
        <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/30 to-transparent" />
        <span className="relative inline-flex items-center gap-2">
          {status === "submitting" ? (
            "Submitting..."
          ) : (
            <>
              {variant === "book-demo" ? "Book my free session" : "Submit request"}
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1.5">
                →
              </span>
            </>
          )}
        </span>
      </Button>

      <p className="text-center text-[11px] text-muted">
        Free · No obligation · Your details are used only to respond to this request
      </p>
    </form>
  );
}
