import { requireArea } from "@/lib/auth/guards";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function SuperAdminLayout({ children }) {
  // Only SUPER_ADMIN may enter the console (AREA_ROLES["super-admin"]).
  // Every page and Server Action re-checks via src/lib/superAdmin/context.js.
  await requireArea("super-admin");
  return children;
}
