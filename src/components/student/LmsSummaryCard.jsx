import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * Dashboard polish (Phase 8.8): a compact real-data summary linking out
 * to Assignments, Attendance and Certificates — every figure here comes
 * from the same server functions those pages themselves use
 * (src/lib/student/{assignments,attendance,certificates}.js), never a
 * separate/fabricated number.
 */
export function LmsSummaryCard({ pendingAssignments, attendancePercentage, certificatesCount }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-dark">LMS Summary</h3>
      <ul className="mt-3 flex flex-col divide-y divide-border text-sm">
        <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
          <Link href="/student/assignments" className="text-text hover:text-primary">
            Pending Assignments
          </Link>
          <Badge variant={pendingAssignments > 0 ? "primary" : "neutral"}>{pendingAssignments}</Badge>
        </li>
        <li className="flex items-center justify-between gap-3 py-2.5">
          <Link href="/student/attendance" className="text-text hover:text-primary">
            Attendance
          </Link>
          <span className="text-xs font-medium text-muted">
            {attendancePercentage === null ? "No records yet" : `${attendancePercentage}%`}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 py-2.5 last:pb-0">
          <Link href="/student/certificates" className="text-text hover:text-primary">
            Certificates
          </Link>
          <Badge variant={certificatesCount > 0 ? "success" : "neutral"}>{certificatesCount}</Badge>
        </li>
      </ul>
    </Card>
  );
}
