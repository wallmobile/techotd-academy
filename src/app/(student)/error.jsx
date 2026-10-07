"use client";

import { LmsError } from "@/components/shared/LmsError";

export default function StudentError({ error, reset }) {
  return <LmsError error={error} reset={reset} homeHref="/student" homeLabel="Go to dashboard" />;
}
