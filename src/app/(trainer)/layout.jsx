import { requireArea } from "@/lib/auth/guards";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function TrainerLayout({ children }) {
  await requireArea("trainer");
  return children;
}
