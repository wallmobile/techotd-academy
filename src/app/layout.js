import "./globals.css";
import { MotionProvider } from "@/components/shared/MotionProvider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://academy.techotd.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TechOTD Academy — Learn. Build. Grow.",
    template: "%s | TechOTD Academy",
  },
  description:
    "TechOTD Academy is the training and education division of TechOTD Pvt. Ltd., offering professional IT courses, live and hybrid classes, and career support.",
  openGraph: {
    type: "website",
    siteName: "TechOTD Academy",
    title: "TechOTD Academy — Learn. Build. Grow.",
    description:
      "Professional IT training, live online and hybrid classes, practical projects, and placement support.",
    url: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
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
