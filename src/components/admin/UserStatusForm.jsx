"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { setUserStatusAction } from "@/lib/admin/actions";

function SubmitButton({ children, variant }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} loading={pending} disabled={pending}>
      {children}
    </Button>
  );
}

/** Activate/deactivate control. Buttons post fixed statuses; the server decides whether the caller may. */
export function UserStatusForm({ userId, status }) {
  const [state, formAction] = useActionState(setUserStatusAction, { status: "idle" });
  const isActive = status === "ACTIVE";

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={isActive ? "INACTIVE" : "ACTIVE"} />
      <div>
        <SubmitButton variant={isActive ? "outline" : "primary"}>{isActive ? "Deactivate account" : "Reactivate account"}</SubmitButton>
      </div>
      {isActive && <p className="text-xs text-muted">A deactivated user is signed out and can&apos;t log in until reactivated.</p>}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.formError}
        </p>
      )}
      {state.status === "success" && (
        <p role="status" className="text-sm font-medium text-success">
          {state.message}
        </p>
      )}
    </form>
  );
}
