import { requireArea } from "@/lib/auth/guards";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }) {
  // "admin" covers every staff-type role (ADMIN, SUPER_ADMIN, COUNSELLOR,
  // ACCOUNTANT, CONTENT_MANAGER, PLACEMENT_MANAGER) per src/lib/auth/roles.js
  // — they share this shell for now but keep distinct role values.
  await requireArea("admin");
  return children;
}
