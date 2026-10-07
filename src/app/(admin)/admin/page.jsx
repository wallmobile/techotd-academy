import { getCurrentUser } from "@/lib/auth/currentUser";
import { PlaceholderDashboard } from "@/components/auth/PlaceholderDashboard";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPlaceholderPage() {
  const user = await getCurrentUser();
  return <PlaceholderDashboard area="Admin" user={user} />;
}
