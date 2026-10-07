// Authentication pages should not be indexed or followed by search
// engines, and must not appear in the public sitemap (see src/app/sitemap.js
// — it only lists (website) routes, so no separate exclusion is needed
// there). This layout-level directive covers every route in this group;
// individual pages still set their own title/description.
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }) {
  return children;
}
