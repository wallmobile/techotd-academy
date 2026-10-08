import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_SOURCES, LEAD_SOURCE_LABELS } from "@/constants/crm";

const SORT_LABELS = { newest: "Newest first", oldest: "Oldest first", name: "Name (A–Z)" };

/**
 * Lead search/filter/sort bar: a plain GET form (works without client JS;
 * the server re-sanitizes every value in parseLeadParams). Course, mode and
 * assignee options come from data that actually exists on leads/users, so no
 * filter is offered for nothing. Submitting resets to page 1.
 */
export function LeadFilters({ params, options }) {
  const active = params.q || params.status || params.source || params.course || params.mode || params.assigned || params.sort !== "newest";
  return (
    <form method="get" action="/admin/leads" role="search" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Input label="Search" id="q" name="q" type="search" defaultValue={params.q} placeholder="Name, email or phone" maxLength={100} />
        </div>
        <Select label="Status" id="status" name="status" defaultValue={params.status}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select label="Source" id="source" name="source" defaultValue={params.source}>
          <option value="">All sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {LEAD_SOURCE_LABELS[s]}
            </option>
          ))}
        </Select>
        {options.courses.length > 0 && (
          <Select label="Course" id="course" name="course" defaultValue={params.course}>
            <option value="">All courses</option>
            {options.courses.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
        {options.modes.length > 0 && (
          <Select label="Mode" id="mode" name="mode" defaultValue={params.mode}>
            <option value="">All modes</option>
            {options.modes.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        )}
        <Select label="Assigned to" id="assigned" name="assigned" defaultValue={params.assigned}>
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          <option value="me">Me</option>
          {options.assignees.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select label="Sort" id="sort" name="sort" defaultValue={params.sort}>
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit">Apply</Button>
        {active && (
          <Link href="/admin/leads" className="text-sm font-medium text-primary hover:text-primary-hover">
            Reset
          </Link>
        )}
      </div>
    </form>
  );
}
