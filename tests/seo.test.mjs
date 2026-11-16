// SEO / AEO / GEO: page metadata, structured data (JSON-LD), sitemap, /llms.txt.
// Pure builders from src/lib/seo.js plus the two route handlers that use the catalog.
import { test } from "node:test";
import assert from "node:assert/strict";
import { courses } from "@/data/courses";
import { trainingModes } from "@/data/trainingModes";
import { faqs } from "@/data/faqs";
import { contact } from "@/constants/contact";
import { listCourses } from "@/lib/catalog";
import sitemap from "@/app/sitemap";
import { GET as llmsTxt } from "@/app/llms.txt/route";
import {
  META_DESCRIPTION_MAX,
  absoluteUrl,
  breadcrumbSchema,
  courseMetaDescription,
  courseSchema,
  courseSeoTitle,
  definedTermSetSchema,
  faqSchema,
  getSiteUrl,
  organizationSchema,
  pageMetadata,
  serializeJsonLd,
  trainingMetaDescription,
  trimDescription,
  webPageSchema,
  websiteSchema,
} from "@/lib/seo";

function withSiteUrl(value, fn) {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = value;
  try {
    return fn();
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  }
}

test("site URL: falls back to the placeholder origin, tolerates a trailing slash, builds absolute URLs", () => {
  withSiteUrl(undefined, () => assert.equal(getSiteUrl(), "https://academy.techotd.in"));
  withSiteUrl("https://staging.example.org/", () => {
    assert.equal(getSiteUrl(), "https://staging.example.org");
    assert.equal(absoluteUrl("/courses"), "https://staging.example.org/courses");
    assert.equal(absoluteUrl("courses"), "https://staging.example.org/courses");
    assert.equal(absoluteUrl(), "https://staging.example.org/");
  });
});

test("trimDescription: short text is untouched, long text is cut on a word boundary within the limit", () => {
  assert.equal(trimDescription("  A   short\n text. "), "A short text.");
  const long = "word ".repeat(80);
  const cut = trimDescription(long);
  assert.ok(cut.length <= META_DESCRIPTION_MAX, `${cut.length} chars`);
  assert.ok(cut.endsWith("…"));
  assert.ok(!/\s…$/.test(cut), "no dangling space before the ellipsis");
});

test("pageMetadata: canonical plus a COMPLETE openGraph and twitter block (a page's own openGraph replaces the root one)", () => {
  const m = pageMetadata({ title: "About Us", description: "About the academy.", path: "/about" });
  assert.equal(m.title, "About Us");
  assert.equal(m.alternates.canonical, "/about");
  assert.deepEqual(
    [m.openGraph.type, m.openGraph.siteName, m.openGraph.locale, m.openGraph.url],
    ["website", "TechOTD Academy", "en_IN", "/about"]
  );
  assert.equal(m.openGraph.title, "About Us | TechOTD Academy", "social title carries the brand (the title template does not apply to it)");
  assert.ok(m.openGraph.images.length > 0 && m.openGraph.images[0].url.startsWith("/"));
  assert.equal(m.twitter.card, "summary_large_image");
  assert.ok(m.twitter.images.length > 0);

  const home = pageMetadata({ absoluteTitle: "TechOTD Academy | IT Training Institute in Noida", description: "x", path: "/" });
  assert.deepEqual(home.title, { absolute: "TechOTD Academy | IT Training Institute in Noida" });
  assert.equal(home.openGraph.title, "TechOTD Academy | IT Training Institute in Noida");
});

test("meta descriptions for every course and training mode fit one search snippet and are never cut mid-sentence", () => {
  for (const course of courses) {
    const text = courseMetaDescription(course);
    assert.ok(text.length >= 60 && text.length <= META_DESCRIPTION_MAX, `${course.slug}: ${text.length} chars`);
    assert.ok(!text.endsWith("…"), `${course.slug} was truncated`);
    assert.ok(text.includes("Noida"), `${course.slug} names the location`);
    assert.ok(!/\(sample\)/i.test(text));
  }
  for (const mode of trainingModes) {
    const text = trainingMetaDescription(mode);
    assert.ok(text.length >= 60 && text.length <= META_DESCRIPTION_MAX, `${mode.slug}: ${text.length} chars`);
    assert.ok(!text.endsWith("…"), `${mode.slug} was truncated`);
  }
  // a course with no summary still gets a sensible description
  assert.ok(courseMetaDescription({ title: "Rust", modes: [] }).includes("Rust"));
});

test("course titles claim Noida only when the course has an in-person format", () => {
  assert.equal(courseSeoTitle({ title: "Full Stack Development", modes: ["Classroom", "Live Online"] }), "Full Stack Development Course in Noida");
  assert.equal(courseSeoTitle({ title: "Hybrid One", modes: ["Hybrid"] }), "Hybrid One Course in Noida");
  assert.equal(courseSeoTitle({ title: "React.js Development", modes: ["Live Online"] }), "React.js Development Course — Live Online");
  assert.equal(courseSeoTitle({ title: "No Modes", modes: [] }), "No Modes Course — Live Online");
});

test("organization schema: the academy's real name, Noida address and contact details, no invented profiles", () => {
  const org = organizationSchema();
  assert.deepEqual(org["@type"], ["EducationalOrganization", "LocalBusiness"]);
  assert.equal(org.name, "TechOTD Academy");
  assert.equal(org.telephone, contact.phone);
  assert.equal(org.address["@type"], "PostalAddress");
  assert.equal(org.address.addressLocality, "Noida");
  assert.equal(org.address.postalCode, "201301");
  assert.equal(org.address.addressCountry, "IN");
  assert.ok(contact.address.includes(org.address.streetAddress), "structured address matches the displayed address");
  assert.ok(org.logo.url.startsWith("https://") && org.image.startsWith("https://"));
  assert.equal(org.sameAs, undefined, "sameAs only appears once real profile URLs are configured");
  assert.ok(!/facebook\.com|instagram\.com|youtube\.com|linkedin\.com/.test(JSON.stringify([org, websiteSchema()])));
  assert.equal(websiteSchema().publisher["@id"], org["@id"]);
});

test("course schema: describes only what the course page shows - nothing sample, no price or rating", () => {
  for (const course of courses) {
    const node = courseSchema(course);
    const json = JSON.stringify(node);
    assert.equal(node["@type"], "Course");
    assert.equal(node.url, absoluteUrl(`/courses/${course.slug}`));
    assert.equal(node.provider["@id"], organizationSchema()["@id"]);
    assert.ok(node.name && node.description, course.slug);
    assert.ok(!/\(sample\)/i.test(json), `${course.slug}: "(sample)" placeholder leaked into structured data`);
    for (const forbidden of ["offers", "aggregateRating", "review", "timeRequired", "coursePrerequisites"]) {
      assert.equal(node[forbidden], undefined, `${course.slug}: ${forbidden} is not verified data`);
    }
    assert.deepEqual(
      node.hasCourseInstance.map((i) => i.courseMode).sort(),
      course.modes
        .map((m) => ({ classroom: "onsite", "live online": "online", hybrid: "blended" })[m.toLowerCase()])
        .sort(),
      course.slug
    );
  }
});

test("faq / breadcrumb / glossary schemas have the shapes search engines expect", () => {
  const faq = faqSchema(faqs);
  assert.equal(faq["@type"], "FAQPage");
  assert.equal(faq.mainEntity.length, faqs.length);
  assert.deepEqual(faq.mainEntity[0], {
    "@type": "Question",
    name: faqs[0].question,
    acceptedAnswer: { "@type": "Answer", text: faqs[0].answer },
  });
  assert.equal(faqSchema([]), null);
  assert.equal(faqSchema(undefined), null);
  assert.equal(faqSchema([{ question: "Q only" }]), null, "an entry without an answer is dropped");

  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Courses", path: "/courses" },
  ]);
  assert.deepEqual(crumbs.itemListElement.map((i) => i.position), [1, 2]);
  assert.ok(crumbs.itemListElement.every((i) => i.item.startsWith("https://")));

  const set = definedTermSetSchema({ name: "Glossary", path: "/blog", terms: [{ name: "Git", description: "Tracks changes." }] });
  assert.equal(set.hasDefinedTerm[0]["@type"], "DefinedTerm");
  assert.equal(set.hasDefinedTerm[0].inDefinedTermSet, set["@id"]);

  const page = webPageSchema({ type: "AboutPage", name: "About", description: "d", path: "/about", aboutOrganization: true });
  assert.equal(page["@type"], "AboutPage");
  assert.equal(page.url, absoluteUrl("/about"));
  assert.equal(page.about["@id"], organizationSchema()["@id"]);
  assert.equal(webPageSchema({ name: "x", description: "d", path: "/x" }).about, undefined);
});

test("serializeJsonLd: valid JSON, one node or an @graph, and a value can never close the <script> tag", () => {
  assert.equal(serializeJsonLd(null), null);
  assert.equal(serializeJsonLd([null, undefined]), null);

  const single = JSON.parse(serializeJsonLd({ "@type": "Thing", name: "x" }));
  assert.deepEqual(single, { "@context": "https://schema.org", "@type": "Thing", name: "x" });

  const graph = JSON.parse(serializeJsonLd([{ "@type": "A" }, null, { "@type": "B" }]));
  assert.equal(graph["@context"], "https://schema.org");
  assert.deepEqual(graph["@graph"].map((n) => n["@type"]), ["A", "B"]);

  const hostile = serializeJsonLd({ "@type": "Thing", name: "</script><script>alert(1)</script>" });
  assert.ok(!hostile.includes("<"), "no raw '<' in the payload");
  assert.equal(JSON.parse(hostile).name, "</script><script>alert(1)</script>", "the text itself is preserved");
});

test("sitemap: every published course, training mode and public page, with absolute URLs and no fake lastmod", async () => {
  const entries = await sitemap();
  const urls = entries.map((e) => e.url);
  assert.equal(new Set(urls).size, urls.length, "no duplicates");
  assert.ok(urls.every((u) => u.startsWith("https://")));
  for (const path of ["/", "/courses", "/batches", "/trainers", "/careers", "/blog", "/about", "/book-demo", "/enquiry"]) {
    assert.ok(urls.includes(absoluteUrl(path)), path);
  }
  for (const mode of trainingModes) assert.ok(urls.includes(absoluteUrl(`/training/${mode.slug}`)), mode.slug);
  for (const course of await listCourses({ publishedOnly: true })) assert.ok(urls.includes(absoluteUrl(`/courses/${course.slug}`)), course.slug);
  for (const hidden of ["/admin", "/super-admin", "/student", "/trainer", "/login", "/register", "/verify-certificate", "/api"]) {
    const listed = urls.some((u) => {
      const { pathname } = new URL(u);
      return pathname === hidden || pathname.startsWith(`${hidden}/`);
    });
    assert.ok(!listed, `${hidden} must not be listed`);
  }
  // Nothing has been edited in this fresh database, so no true modification date exists:
  // an entry either omits lastModified or carries a real, past Date - never "now" on every request.
  for (const entry of entries) {
    assert.ok(entry.lastModified === undefined || (entry.lastModified instanceof Date && entry.lastModified.getTime() <= Date.now()), entry.url);
  }
  assert.ok(entries.every((e) => e.lastModified === undefined), "untouched content has no invented lastmod");
});

test("/llms.txt: plain-text site summary for AI assistants, generated from the real catalog and FAQs", async () => {
  const res = await llmsTxt();
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/plain/);
  const body = await res.text();

  assert.ok(body.startsWith("# TechOTD Academy\n"));
  assert.match(body, /\n> .*Noida/, "one-sentence summary naming the location");
  for (const course of await listCourses({ publishedOnly: true })) {
    assert.ok(body.includes(`[${course.title}](${absoluteUrl(`/courses/${course.slug}`)})`), course.slug);
  }
  for (const mode of trainingModes) assert.ok(body.includes(absoluteUrl(`/training/${mode.slug}`)), mode.slug);
  assert.ok(body.includes(contact.address) && body.includes(contact.phone));
  assert.ok(body.includes("Placement is not guaranteed"), "carries the site's own no-guarantee statement");
  assert.ok(!/\(sample\)/i.test(body));
  assert.ok(!body.includes("<"), "no HTML in a plain-text file");
});
