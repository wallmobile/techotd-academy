import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBar } from "@/components/home/AnnouncementBar";

/**
 * Shared public-website shell (Announcement bar + Header + Footer).
 * Every route inside the (website) group inherits this automatically —
 * pages should not render their own Header/Footer.
 */
export default function WebsiteLayout({ children }) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
