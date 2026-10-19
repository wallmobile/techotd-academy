"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { createStaffAction } from "@/lib/superAdmin/actions";
import { CREATABLE_STAFF_ROLES, ROLE_LABELS } from "@/constants/roles";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending}>
      Create Account
    </Button>
  );
}

const initialState = { status: "idle", errors: {}, formError: null, values: {} };

/**
 * Super Admin "create staff account" form. The role select only offers
 * CREATABLE_STAFF_ROLES and the server re-validates it — a forged value
 * (e.g. SUPER_ADMIN) is rejected. The password is never sent back in state.
 */
export function CreateStaffForm() {
  const [state, formAction] = useActionState(createStaffAction, initialState);
  const errorRef = useRef(null);

  useEffect(() => {
    if (state.formError) errorRef.current?.focus();
  }, [state]);

  const values = state.values || {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.formError && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger outline-none"
        >
          {state.formError}
        </p>
      )}

      <Input label="Full name" id="name" name="name" autoComplete="off" defaultValue={values.name ?? ""} error={state.errors?.name} required />
      <Input label="Email" id="email" name="email" type="email" autoComplete="off" defaultValue={values.email ?? ""} error={state.errors?.email} required />
      <Input label="Phone (optional)" id="phone" name="phone" type="tel" autoComplete="off" defaultValue={values.phone ?? ""} error={state.errors?.phone} />
      <Select label="Role" id="role" name="role" defaultValue={values.role ?? ""} error={state.errors?.role} required>
        <option value="" disabled>
          Select a role
        </option>
        {CREATABLE_STAFF_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </Select>
      <Input
        label="Temporary password"
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={state.errors?.password}
        required
      />
      <p className="text-xs text-muted">
        Minimum 8 characters. Share it securely — they can change it after signing in. A new Super Admin can&apos;t be
        created here; use <code>npm run setup:admin</code>.
      </p>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
