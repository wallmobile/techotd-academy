"use client";

import { LmsError } from "@/components/shared/LmsError";

export default function TrainerError({ error, reset }) {
  return <LmsError error={error} reset={reset} homeHref="/trainer" homeLabel="Go to dashboard" />;
}
