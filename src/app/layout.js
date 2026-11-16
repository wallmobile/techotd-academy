import "./globals.css";
import { MotionProvider } from "@/components/shared/MotionProvider";
import { SITE_LOCALE, SITE_NAME, shareImages } from "@/constants/seo";
import { getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();

const defaultTitle = "TechOTD Academy — Learn. Build. Grow.";
// Fallback for any page that does not set its own description.
const defaultDescription =
  "IT training institute in Noida by TechOTD Pvt. Ltd. — professional courses, live online, classroom and hybrid classes, hands-on projects and career support.";

// Search Console / Bing Webmaster ownership tags. Optional: set GOOGLE_SITE_VERIFICATION
// and/or BING_SITE_VERIFICATION (the token only, not the whole tag) and the matching
// <meta> is added; leave them unset and nothing is rendered.
const verification = {
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
  ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
};

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: SITE_NAME,
  title: {
    default: defaultTitle,
    template: "%s | TechOTD Academy",
  },
  description: defaultDescription,
  // A page that sets its own `openGraph`/`twitter` replaces these entirely
  // (see pageMetadata() in src/lib/seo.js, which repeats every field).
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    title: defaultTitle,
    description:
      "Professional IT training, live online and hybrid classes, practical projects, and career support.",
    images: shareImages,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description:
      "Professional IT training, live online and hybrid classes, practical projects, and career support.",
    images: shareImages,
  },
  robots: {
    index: true,
    follow: true,
    // Let search engines show full-size image previews and complete snippets.
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(Object.keys(verification).length ? { verification } : {}),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
