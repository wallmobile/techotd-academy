"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EnquirySuccess } from "@/components/enquiry/EnquirySuccess";
import { courses } from "@/data/courses";
import { submitEnquiry } from "@/lib/enquiry";
import { validateEnquiryForm } from "@/lib/validateEnquiry";

const EMPTY_VALUES = { name: "", phone: "", email: "", course: "" };

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="6.5" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 17c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 6l6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 3.5h2.2l1 3.3-1.7 1.3a9 9 0 004.4 4.4l1.3-1.7 3.3 1v2.2c0 .9-.7 1.6-1.6 1.5A13 13 0 013.5 5.1c-.1-.9.6-1.6 1.5-1.6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 4.5c1.8-.7 4-.7 6 0 2-.7 4.2-.7 6 0v11c-1.8-.7-4-.7-6 0-2-.7-4.2-.7-6 0v-11z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 4.5v11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Compact 4-field lead-capture widget embedded directly in the homepage
 * hero (as opposed to the full EnquiryForm on /enquiry and /book-demo).
 * Deliberately reuses the same submitEnquiry() boundary and
 * validateEnquiryForm() rules (via the "quick" variant, which only skips
 * the separate consent checkbox — a static line covers the same consent
 * intent here) rather than duplicating validation or inventing a second
 * submission path. Submissions are stored as leads (source ENQUIRY,
 * origin "homepage"); the success state still promises nothing beyond receipt.
 */
export function HeroEnquiryForm() {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success
  const [submittedName, setSubmittedName] = useState("");

  function updateField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateEnquiryForm(values, "quick");
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("submitting");

    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      interestedCourse: values.course || undefined,
      source: "homepage",
      consent: true,
    };

    const result = await submitEnquiry(payload, "quick");

    if (result.ok) {
      setSubmittedName(payload.name);
      setStatus("success");
    } else {
      setStatus("idle");
      setErrors({ form: result.error || "Something went wrong. Please try again." });
    }
  }

  if (status === "success") {
    return <EnquirySuccess name={submittedName} onReset={() => {
      setValues(EMPTY_VALUES);
      setErrors({});
      setStatus("idle");
    }} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 9l7-5 7 5-7 5-7-5zm0 0v5.5c0 .6 3.1 2 7 2s7-1.4 7-2V9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <h2 className="text-xl font-bold text-dark sm:text-2xl">Get Free Consultation</h2>
          <p className="mt-0.5 text-sm text-muted">Tell us a bit about you — we&apos;ll get in touch.</p>
        </div>
      </div>

      <div className="h-px w-full bg-border" aria-hidden="true" />

      {errors.form && (
        <p role="alert" className="rounded-sm bg-danger/10 px-4 py-3 text-sm text-danger">
          {errors.form}
        </p>
      )}

      <Input
        label="Your Name"
        name="name"
        autoComplete="name"
        placeholder="Full name"
        icon={<UserIcon />}
        value={values.name}
        onChange={(event) => updateField("name", event.target.value)}
        error={errors.name}
      />
      <Input
        label="Email Address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        icon={<MailIcon />}
        value={values.email}
        onChange={(event) => updateField("email", event.target.value)}
        error={errors.email}
      />
      <Input
        label="Mobile Number"
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        icon={<PhoneIcon />}
        value={values.phone}
        onChange={(event) => updateField("phone", event.target.value)}
        error={errors.phone}
      />
      <Select
        label="Course of Interest"
        name="course"
        icon={<BookIcon />}
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

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={status === "submitting"} loading={status === "submitting"}>
        {status === "submitting" ? "Submitting..." : "Submit"}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6.5 9V6.5a3.5 3.5 0 017 0V9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        By submitting, you agree to be contacted about this request.
      </p>
    </form>
  );
}
