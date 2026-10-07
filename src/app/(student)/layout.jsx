import { requireArea } from "@/lib/auth/guards";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function StudentLayout({ children }) {
  // Enforces both authentication and role at the server boundary for
  // every route under this group, not just the single placeholder page —
  // so future student pages added here inherit protection automatically.
  await requireArea("student");
  return children;
}
