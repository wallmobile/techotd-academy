import { Button } from "@/components/ui/Button";
import { setEmailPreferenceAction } from "@/lib/notifications/actions";

/**
 * Per-user email opt-out, shared by the student, trainer and staff
 * notification pages. A plain server-action form (works without JS). It only
 * affects email delivery; in-app notifications always continue.
 */
export function EmailPreferenceForm({ enabled }) {
  return (
    <form
      action={setEmailPreferenceAction}
      className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-white px-4 py-3"
    >
      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" name="emailNotifications" defaultChecked={enabled} className="h-4 w-4 rounded border-border" />
        Also email me my notifications
      </label>
      <Button type="submit" variant="outline" size="sm">
        Save preference
      </Button>
    </form>
  );
}
