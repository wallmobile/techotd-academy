import { serializeJsonLd } from "@/lib/seo";

/**
 * Renders schema.org structured data as a JSON-LD <script> (server component, no
 * visual output). Pass one node or an array of nodes (builders in src/lib/seo.js);
 * several nodes become one "@graph". Falsy entries are skipped.
 */
export function JsonLd({ data }) {
  const json = serializeJsonLd(data);
  if (!json) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
