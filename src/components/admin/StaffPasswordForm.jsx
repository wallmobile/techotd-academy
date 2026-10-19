"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";
import { changeStaffPasswordAction } from "@/lib/admin/accountActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending}>
      Change password
    </Button>
  );
}

const initialState = { status: "idle", errors: {}, formError: null };

/** Current password is required; passwords are never shown back or kept in state. */
export function StaffPasswordForm() {
  const [state, formAction] = useActionState(changeStaffPasswordAction, initialState);
  const successRef = useRef(null);

  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <p ref={successRef} tabIndex={-1} role="status" className="rounded-sm border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success outline-none">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.formError && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.formError}
        </p>
      )}
      <PasswordField label="Current password" id="currentPassword" name="currentPassword" autoComplete="current-password" error={state.errors?.currentPassword} />
      <PasswordField label="New password" id="password" name="password" autoComplete="new-password" error={state.errors?.password} />
      <PasswordField label="Confirm new password" id="confirmPassword" name="confirmPassword" autoComplete="new-password" error={state.errors?.confirmPassword} />
      <p className="text-xs text-muted">At least 8 characters. Changing your password signs you out of every other device.</p>
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
