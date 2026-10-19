"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * A submit button for a destructive-ish action. It must be rendered INSIDE the
 * <form> it submits: clicking opens an accessible confirmation dialog, and only
 * the dialog's confirm button actually submits the form. With needsConfirm=false
 * it is an ordinary submit button, so one form can confirm only some choices.
 */
export function ConfirmButton({ children, title, message, confirmLabel = "Confirm", variant = "outline", size = "sm", needsConfirm = true }) {
  const [open, setOpen] = useState(false);
  const { pending } = useFormStatus();

  if (!needsConfirm) {
    return (
      <Button type="submit" size={size} variant={variant} loading={pending} disabled={pending}>
        {children}
      </Button>
    );
  }

  return (
    <>
      <Button type="button" size={size} variant={variant} disabled={pending} loading={pending} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-sm text-muted">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" onClick={() => setOpen(false)}>
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
