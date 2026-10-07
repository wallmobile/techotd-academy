"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function AuthSubmitButton({ children, className }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending} className={className}>
      {children}
    </Button>
  );
}
