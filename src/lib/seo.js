// Search / answer-engine / generative-engine helpers (SEO, AEO, GEO).
//
// Pure functions: no database, no React. They build
//   - per-page <head> metadata (title, description, canonical, Open Graph, Twitter)
//   - schema.org JSON-LD nodes (rendered by components/seo/JsonLd.jsx)
// so every page says the same, consistent things about the academy.
//
// Structured data must describe what is VISIBLE on the page. Several catalog
// fields (durations, schedules, prerequisites) are still marked "(sample)" in
// src/data, so they are deliberately NOT emitted here: nothing unverified is
// published as a fact. No prices, ratings or reviews are emitted either, because
// the site does not show any.

import { contact } from "@/constants/contact";
import {
  PARENT_ORGANIZATION,
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_LOCALE,
  SITE_NAME,
  shareImages,
  socialProfiles,
} from "@/constants/seo";

const DEFAULT_SITE_URL = "https://academy.techotd.in";

/** The site origin without a trailing slash. */
export function getSiteUrl() {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "").trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path = "/") {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

// Google shows roughly 155-160 characters of a meta description.
export const META_DESCRIPTION_MAX = 160;

/** Collapse whitespace and cut to `max` characters on a word boundary (a safety net: write descriptions that already fit). */
export function trimDescription(text, max = META_DESCRIPTION_MAX) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:—–-]+$/, "")}…`;
}

// ------------------------------------------------------------------ metadata

/**
 * Complete Next.js `metadata` for a public page. Always sets a canonical URL and a
 * FULL openGraph/twitter block (a page's own `openGraph` replaces the root one
 * entirely, so type, site name, locale and image must be repeated every time).
 *
 *   title          plain title; the root layout's template appends " | TechOTD Academy"
 *   absoluteTitle  use instead of `title` to skip the template (home page)
 *   path           the page's own path, e.g. "/courses" (resolved against metadataBase)
 */
export function pageMetadata({ title, absoluteTitle, openGraphTitle, description, path }) {
  const desc = trimDescription(description);
  const socialTitle = openGraphTitle ?? absoluteTitle ?? `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      title: socialTitle,
      description: desc,
      url: path,
      images: shareImages,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: desc,
      images: shareImages,
    },
  };
}

// ------------------------------------------------------------------- JSON-LD
// Every builder returns ONE schema.org node WITHOUT "@context";
// serializeJsonLd() adds the context and wraps several nodes in an "@graph".

/**
 * One node or an array of nodes -> the text of a JSON-LD <script> (or null when there is
 * nothing to say). "<" is written as < so a value containing "</script>" can never
 * close the tag early; JSON parsers read it back as the same character.
 */
export function serializeJsonLd(data) {
  const nodes = (Array.isArray(data) ? data : [data]).filter(Boolean);
  if (nodes.length === 0) return null;
  const payload =
    nodes.length === 1
      ? { "@context": "https://schema.org", ...nodes[0] }
      : { "@context": "https://schema.org", "@graph": nodes };
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

const orgId = () => `${getSiteUrl()}/#organization`;
const websiteId = () => `${getSiteUrl()}/#website`;
const isHttpsUrl = (value) => typeof value === "string" && /^https:\/\/[^\s]+$/i.test(value);

/** A reference to the academy that is complete on its own (not only an @id). */
function organizationRef() {
  return { "@type": "EducationalOrganization", "@id": orgId(), name: SITE_NAME, url: `${getSiteUrl()}/` };
}

function websiteRef() {
  return { "@type": "WebSite", "@id": websiteId(), name: SITE_NAME, url: `${getSiteUrl()}/` };
}

/** The academy itself: an educational organisation with a physical location in Noida. */
export function organizationSchema() {
  const sameAs = socialProfiles.filter(isHttpsUrl);
  return {
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "@id": orgId(),
    name: SITE_NAME,
    url: `${getSiteUrl()}/`,
    description: SITE_DESCRIPTION,
    logo: { "@type": "ImageObject", url: absoluteUrl("/techotd-logo-v3.png"), width: 1723, height: 555 },
    image: absoluteUrl(shareImages[0].url),
    telephone: contact.phone,
    email: contact.email,
    address: { "@type": "PostalAddress", ...contact.postalAddress },
    contactPoint: [
      { "@type": "ContactPoint", contactType: "admissions", telephone: contact.phone, email: contact.email },
    ],
    parentOrganization: { "@type": "Organization", name: PARENT_ORGANIZATION },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": websiteId(),
    url: `${getSiteUrl()}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    publisher: organizationRef(),
  };
}

/**
 * The page itself. `type` may be a more specific WebPage type
 * ("AboutPage", "CollectionPage"); `aboutOrganization` marks pages that are
 * about the academy as a whole (home, about).
 */
export function webPageSchema({ type = "WebPage", name, description, path, aboutOrganization = false }) {
  return {
    "@type": type,
    "@id": `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name,
    description: trimDescription(description),
    inLanguage: SITE_LANGUAGE,
    isPartOf: websiteRef(),
    ...(aboutOrganization ? { about: organizationRef() } : {}),
  };
}

/** items: [{ name, path }] from the home page down to the current page. */
export function breadcrumbSchema(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Question & answer pairs that are shown on the page. faqs: [{ question, answer }] */
export function faqSchema(faqs) {
  const entries = (faqs ?? []).filter((faq) => faq?.question && faq?.answer);
  if (entries.length === 0) return null;
  return {
    "@type": "FAQPage",
    mainEntity: entries.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** items: [{ name, path }] */
export function itemListSchema(items) {
  return {
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

// How each course "mode" shown on the site maps to schema.org's courseMode.
const COURSE_MODES = {
  classroom: "onsite",
  offline: "onsite",
  "live online": "online",
  online: "online",
  hybrid: "blended",
};

const isSample = (text) => /\(sample\)/i.test(String(text));

export function courseSchema(course) {
  const url = absoluteUrl(`/courses/${course.slug}`);
  const teaches = (course.outcomes ?? []).filter((outcome) => !isSample(outcome));
  const instances = (course.modes ?? [])
    .map((mode) => ({ mode, courseMode: COURSE_MODES[String(mode).toLowerCase()] }))
    .filter((entry) => entry.courseMode)
    .map(({ mode, courseMode }) => ({
      "@type": "CourseInstance",
      name: `${course.title} — ${mode}`,
      courseMode,
    }));

  return {
    "@type": "Course",
    "@id": `${url}#course`,
    name: course.title,
    // The paragraph the page itself opens "About this course" with (CourseOverview.jsx).
    description: (course.overview?.length ? course.overview[0] : course.description) || course.shortDescription,
    url,
    inLanguage: SITE_LANGUAGE,
    image: absoluteUrl(shareImages[0].url),
    provider: organizationRef(),
    ...(course.level ? { educationalLevel: course.level } : {}),
    ...(teaches.length ? { teaches } : {}),
    ...(course.technologies?.length ? { keywords: course.technologies.join(", ") } : {}),
    educationalCredentialAwarded: "Certificate of Completion",
    ...(instances.length ? { hasCourseInstance: instances } : {}),
  };
}

/** A plain-language glossary: terms: [{ name, description }] */
export function definedTermSetSchema({ name, path, terms }) {
  const setId = `${absoluteUrl(path)}#glossary`;
  return {
    "@type": "DefinedTermSet",
    "@id": setId,
    name,
    url: absoluteUrl(path),
    inLanguage: SITE_LANGUAGE,
    hasDefinedTerm: terms.map((term) => ({
      "@type": "DefinedTerm",
      name: term.name,
      description: term.description,
      inDefinedTermSet: setId,
    })),
  };
}

// --------------------------------------------------------- course page copy

/** "Classroom, Live Online and Hybrid" -> "classroom, live online and hybrid" */
export function joinModes(modes) {
  const list = (modes ?? []).map((mode) => String(mode).toLowerCase());
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

const IN_PERSON_MODES = new Set(["classroom", "offline", "hybrid"]);

/**
 * "<Course> Course in Noida" only when the course really has an in-person (classroom
 * or hybrid) format; a live-online-only course is titled for what it is instead.
 */
export function courseSeoTitle(course) {
  const inPerson = (course.modes ?? []).some((mode) => IN_PERSON_MODES.has(String(mode).toLowerCase()));
  return inPerson ? `${course.title} Course in Noida` : `${course.title} Course — Live Online`;
}

/**
 * Meta description for a course page: what it is (the course's own summary),
 * who runs it and where, and what formats it comes in. No duration, price or
 * placement claim - those are not verified.
 */
export function courseMetaDescription(course) {
  const summary = (course.shortDescription || "").trim();
  const lead = summary ? (/[.!?]$/.test(summary) ? summary : `${summary}.`) : `${course.title} course.`;
  const formats = course.modes?.length ? `${joinModes(course.modes)} classes` : "classes";
  return firstThatFits([
    `${lead} ${course.title} course at TechOTD Academy, Noida: ${formats}. Hands-on projects and career support.`,
    `${lead} ${course.title} course at TechOTD Academy, Noida: ${formats}.`,
    `${lead} ${course.title} course at TechOTD Academy, Noida.`,
    `${lead} At TechOTD Academy, Noida.`,
  ]);
}

/** Meta description for a training-mode page (online, classroom, ...). */
export function trainingMetaDescription(trainingMode) {
  const summary = (trainingMode.shortDescription || "").trim();
  const lead = summary ? (/[.!?]$/.test(summary) ? summary : `${summary}.`) : `${trainingMode.title}.`;
  return firstThatFits([
    `${lead} At TechOTD Academy, Noida. Practical projects and trainer support.`,
    `${lead} At TechOTD Academy, Noida.`,
  ]);
}

/** The longest-first candidate that fits a meta description whole (a sentence is never cut in half). */
function firstThatFits(candidates) {
  const fits = candidates.find((text) => text.length <= META_DESCRIPTION_MAX);
  return fits ?? trimDescription(candidates[candidates.length - 1]);
}
