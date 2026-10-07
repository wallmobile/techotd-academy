"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { updateProfileAction } from "@/lib/student/profileActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending}>
      Save Changes
    </Button>
  );
}

/**
 * Editable profile fields only: name, phone, city, bio. There is no
 * field here for email, role, or account status — see
 * updateProfileAction, which never reads those from the form at all.
 */
export function ProfileEditForm({ initialValues }) {
  const [state, formAction] = useActionState(updateProfileAction, {
    status: "idle",
    errors: {},
    formError: null,
    values: initialValues,
  });
  const successRef = useRef(null);

  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state]);

  const values = state.values || initialValues;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.status === "success" && (
        <p
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="rounded-sm border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success outline-none"
        >
          {state.message}
        </p>
      )}

      {state.formError && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.formError}
        </p>
      )}

      <Input label="Full Name" id="name" name="name" defaultValue={values.name} error={state.errors?.name} required />

      <Input
        label="Phone"
        id="phone"
        name="phone"
        type="tel"
        defaultValue={values.phone}
        error={state.errors?.phone}
      />

      <Input label="City" id="city" name="city" defaultValue={values.city} error={state.errors?.city} />

      <Textarea
        label="Bio"
        id="bio"
        name="bio"
        rows={4}
        defaultValue={values.bio}
        error={state.errors?.bio}
      />

      <SubmitButton />
    </form>
  );
}
