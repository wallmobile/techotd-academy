// Per request: robots.txt carries the site origin (the Sitemap: line), and a file
// prerendered at build time would freeze whatever origin the BUILD machine had.
export const dynamic = "force-dynamic";

export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://academy.techotd.in";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, authenticated areas and the certificate-verification lookup
      // are not for crawlers (they are also noindex).
      //
      // robots.txt rules are PREFIX matches, so a bare "/trainer" also blocked the public
      // /trainers page (found by Lighthouse "is-crawlable"). The trainer area is therefore
      // listed as "/trainer/" (everything inside it) plus "/trainer$" (the dashboard URL
      // itself; "$" = end of URL). None of the other entries is a prefix of a public page.
      disallow: ["/admin", "/super-admin", "/student", "/trainer/", "/trainer$", "/verify-certificate", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
