/**
 * Link-preview image (WhatsApp, Facebook, LinkedIn, X...). Pages that set their
 * own `openGraph` replace the root one entirely, so they must include this too -
 * `pageMetadata()` in src/lib/seo.js does, along with the rest of the shared
 * Open Graph / Twitter fields.
 */
export const shareImages = [
  { url: "/og-image.jpg", width: 1200, height: 630, alt: "TechOTD Academy — Learn, Build, Grow" },
];

export const SITE_NAME = "TechOTD Academy";
export const SITE_LOCALE = "en_IN"; // Open Graph locale
export const SITE_LANGUAGE = "en-IN"; // schema.org inLanguage (BCP 47)
export const PARENT_ORGANIZATION = "TechOTD Pvt. Ltd.";

// One sentence that says who the academy is, where it is and what it offers.
// Reused for the site-wide Organization/WebSite structured data and /llms.txt,
// so search engines and AI assistants get the same plain statement everywhere.
export const SITE_DESCRIPTION =
  "TechOTD Academy is the training and education division of TechOTD Pvt. Ltd., an IT training institute in Noida, Uttar Pradesh, India, offering live online, classroom and hybrid courses with hands-on projects and career support.";

/**
 * The academy's OWN profiles on other sites, as full https:// URLs (for example
 * "https://www.linkedin.com/company/<page>"). They become `sameAs` in the
 * Organization structured data, which is how search and AI engines connect this
 * site to the same brand elsewhere. Leave empty until the real profile URLs are
 * known - never put a generic home page like https://facebook.com here.
 */
export const socialProfiles = [];
