"use client";

import { LmsError } from "@/components/shared/LmsError";

export default function AdminError({ error, reset }) {
  return <LmsError error={error} reset={reset} homeHref="/admin" homeLabel="Go to dashboard" />;
}
