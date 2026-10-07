export const categories = [
  { slug: "full-stack-development", code: "FS", title: "Full Stack Development", description: "Frontend, backend and databases in one learning path.", href: "/courses?category=full-stack-development" },
  { slug: "frontend-development", code: "FE", title: "Frontend Development", description: "Build modern, responsive user interfaces.", href: "/courses?category=frontend-development" },
  { slug: "backend-development", code: "BE", title: "Backend Development", description: "APIs, servers and databases at scale.", href: "/courses?category=backend-development" },
  { slug: "ai-generative-ai", code: "AI", title: "AI & Generative AI", description: "Practical AI tooling and applied use cases.", href: "/courses?category=ai-generative-ai" },
  { slug: "data-analytics", code: "DA", title: "Data Analytics", description: "Turn raw data into clear, usable insight.", href: "/courses?category=data-analytics" },
  { slug: "cloud-devops", code: "CD", title: "Cloud & DevOps", description: "Deploy, scale and automate infrastructure.", href: "/courses?category=cloud-devops" },
  { slug: "programming", code: "PR", title: "Programming", description: "Core programming fundamentals and languages.", href: "/courses?category=programming" },
  { slug: "testing-qa", code: "QA", title: "Testing & QA", description: "Manual and automated quality engineering.", href: "/courses?category=testing-qa" },
];

export function getCategoryBySlug(slug) {
  return categories.find((category) => category.slug === slug);
}
