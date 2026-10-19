"use client";

import { LmsError } from "@/components/shared/LmsError";

export default function SuperAdminError({ error, reset }) {
  return <LmsError error={error} reset={reset} homeHref="/super-admin" homeLabel="Go to console" />;
}
