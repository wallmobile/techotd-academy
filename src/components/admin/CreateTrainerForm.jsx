"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createTrainerAction } from "@/lib/admin/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending}>
      Create Trainer
    </Button>
  );
}

const initialState = { status: "idle", errors: {}, formError: null, values: {} };

/**
 * Admin "create trainer" form. There is deliberately no role field: the
 * server action always creates a TRAINER, whatever the request contains.
 * The password is never sent back in action state.
 */
export function CreateTrainerForm() {
  const [state, formAction] = useActionState(createTrainerAction, initialState);
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
        Minimum 8 characters. Share it with the trainer securely — they can change it after signing in. The account is
        created with the Trainer role.
      </p>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
