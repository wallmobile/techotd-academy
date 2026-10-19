// Per request: robots.txt carries the site origin (the Sitemap: line), and a file
// prerendered at build time would freeze whatever origin the BUILD machine had.
export const dynamic = "force-dynamic";

export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://academy.techotd.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, authenticated areas and the certificate-verification lookup
      // are not for crawlers (they are also noindex).
      disallow: ["/admin", "/super-admin", "/student", "/trainer", "/verify-certificate", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
