export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://academy.techotd.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, authenticated areas and the certificate-verification lookup
      // are not for crawlers (they are also noindex).
      disallow: ["/admin", "/super-admin", "/student", "/trainer", "/verify-certificate"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
