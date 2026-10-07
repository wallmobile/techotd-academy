"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { assignTrainerBatchAction } from "@/lib/admin/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" loading={pending} disabled={pending}>
      Assign Batch
    </Button>
  );
}

const initialState = { status: "idle" };

/** Assign a catalog batch the trainer doesn't already have. The server re-validates everything. */
export function AssignBatchForm({ trainerId, batches }) {
  const [state, formAction] = useActionState(assignTrainerBatchAction, initialState);

  if (batches.length === 0) {
    return <p className="text-sm text-muted">This trainer is already assigned to every available batch.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="trainerId" value={trainerId} />
      <Select label="Batch" id="batchId" name="batchId" defaultValue="" required>
        <option value="" disabled>
          Select a batch…
        </option>
        {batches.map((batch) => (
          <option key={batch.id} value={batch.id}>
            {batch.label}
          </option>
        ))}
      </Select>
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
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
