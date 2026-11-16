import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBar } from "@/components/home/AnnouncementBar";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo";

// The catalog (courses, batches) is database-backed and admin-editable, so these
// pages must be rendered per request rather than frozen at build time.
export const dynamic = "force-dynamic";

/**
 * Shared public-website shell (Announcement bar + Header + Footer).
 * Every route inside the (website) group inherits this automatically —
 * pages should not render their own Header/Footer.
 */
export default function WebsiteLayout({ children }) {
  return (
    <>
      {/* Who the academy is (name, logo, Noida address, contact) - for search and AI engines. */}
      <JsonLd data={[organizationSchema(), websiteSchema()]} />
      <AnnouncementBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
