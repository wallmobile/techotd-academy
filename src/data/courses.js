/**
 * Sample/demo course catalog for the design-preview phase. Durations,
 * schedules and outcomes are illustrative — replace with verified
 * program data before launch.
 *
 * `order` is an explicit, intentionally-assigned field used for the
 * "Newest" sort option, since no real creation date exists yet. Higher
 * numbers were added more recently.
 */

import { courseSyllabus } from "@/data/courseSyllabus";

const certification =
  "Certificate of Completion, awarded on meeting the program's completion criteria. Certificate details and eligibility may vary by program.";

const baseCourses = [
  {
    id: "full-stack-development",
    slug: "full-stack-development",
    order: 8,
    title: "Full Stack Development",
    shortDescription: "Build and ship complete web applications end to end.",
    description:
      "A project-based path covering the frontend, backend and database work needed to build and ship a complete web application from scratch.",
    category: "Full Stack Development",
    categorySlug: "full-stack-development",
    level: "Beginner",
    levelLabel: "Beginner → Advanced",
    duration: "4–6 Months (sample)",
    durationBand: "Long (4+ Months)",
    modes: ["Classroom", "Live Online", "Hybrid"],
    featured: true,
    popular: true,
    accent: "primary",
    initials: "FSD",
    technologies: ["HTML", "CSS", "JavaScript", "React", "Node.js", "Express", "MongoDB", "Git"],
    prerequisites: ["No prior coding experience required (sample)", "Basic computer literacy"],
    outcomes: [
      "Build responsive interfaces",
      "Create REST APIs",
      "Work with databases",
      "Build authentication flows",
      "Deploy web applications",
      "Work with Git and GitHub",
    ],
    modules: [
      {
        title: "Module 01 — Foundations",
        duration: "2 Weeks (sample)",
        items: [
          { type: "lesson", title: "HTML, CSS and responsive layout" },
          { type: "lesson", title: "JavaScript fundamentals" },
          { type: "lesson", title: "Version control with Git" },
          { type: "assignment", title: "Build a static landing page" },
        ],
      },
      {
        title: "Module 02 — Core Development",
        duration: "5 Weeks (sample)",
        items: [
          { type: "lesson", title: "React components and state" },
          { type: "lesson", title: "Building REST APIs with Node.js and Express" },
          { type: "lesson", title: "Working with MongoDB" },
          { type: "assignment", title: "Connect a React frontend to an API" },
        ],
      },
      {
        title: "Module 03 — Advanced & Project Work",
        duration: "6 Weeks (sample)",
        items: [
          { type: "lesson", title: "Authentication and authorization" },
          { type: "lesson", title: "Deployment fundamentals" },
          { type: "project", title: "Capstone: full-stack application (example project)" },
        ],
      },
    ],
    projects: [
      { title: "Task Management App", problem: "Organizing work across a team.", tech: "React, Node.js, MongoDB", outcome: "A working full-stack app with authentication (example project)." },
      { title: "E-Commerce Storefront", problem: "Browsing and purchasing products online.", tech: "React, Express, MongoDB", outcome: "A catalog, cart and checkout flow (example project)." },
    ],
    certification,
    faqs: [
      { question: "Is this course beginner friendly?", answer: "Yes, it's designed to take you from the fundamentals through to advanced, project-based work." },
      { question: "Which learning modes are available?", answer: "This course is available in classroom, live online and hybrid formats." },
      { question: "Will I build real projects?", answer: "Yes, the course includes hands-on assignments and a capstone project." },
    ],
  },
  {
    id: "mern-stack-development",
    slug: "mern-stack-development",
    order: 7,
    title: "MERN Stack Development",
    shortDescription: "Build modern full-stack applications using MongoDB, Express, React and Node.js.",
    description:
      "A focused path through the MERN stack — MongoDB, Express, React and Node.js — for building modern, production-style full-stack applications.",
    category: "Full Stack Development",
    categorySlug: "full-stack-development",
    level: "Intermediate",
    levelLabel: "Intermediate → Advanced",
    duration: "4–6 Months (sample)",
    durationBand: "Long (4+ Months)",
    modes: ["Classroom", "Live Online"],
    featured: true,
    popular: true,
    accent: "secondary",
    initials: "MERN",
    technologies: ["MongoDB", "Express", "React", "Node.js", "REST APIs", "Git"],
    prerequisites: ["Basic programming fundamentals (sample)", "Familiarity with web concepts is helpful"],
    outcomes: [
      "Build full-stack apps with MongoDB, Express, React and Node.js",
      "Design REST APIs",
      "Manage application state",
      "Handle authentication",
      "Deploy a MERN application",
      "Debug across the stack",
    ],
    modules: [
      {
        title: "Module 01 — Foundations",
        duration: "2 Weeks (sample)",
        items: [
          { type: "lesson", title: "MERN architecture overview" },
          { type: "lesson", title: "Setting up a Node.js + Express server" },
          { type: "assignment", title: "Build a basic REST API" },
        ],
      },
      {
        title: "Module 02 — Core Development",
        duration: "5 Weeks (sample)",
        items: [
          { type: "lesson", title: "Data modeling with MongoDB" },
          { type: "lesson", title: "Building the React frontend" },
          { type: "lesson", title: "Connecting frontend and backend" },
          { type: "assignment", title: "CRUD application" },
        ],
      },
      {
        title: "Module 03 — Advanced & Project Work",
        duration: "6 Weeks (sample)",
        items: [
          { type: "lesson", title: "Authentication with JWT" },
          { type: "lesson", title: "Deploying a MERN application" },
          { type: "project", title: "Capstone: MERN application (example project)" },
        ],
      },
    ],
    projects: [
      { title: "CRM Platform", problem: "Managing leads and customer relationships.", tech: "MongoDB, Express, React, Node.js", outcome: "Lead pipelines and contact tracking (example project)." },
      { title: "Analytics Dashboard", problem: "Turning raw data into decisions.", tech: "React, Node.js, MongoDB", outcome: "Interactive charts and filterable reports (example project)." },
    ],
    certification,
    faqs: [
      { question: "How is this different from the general Full Stack course?", answer: "This course focuses specifically on the MERN stack rather than covering multiple stack options." },
      { question: "Do I need prior experience?", answer: "Basic programming fundamentals are helpful but not strictly required." },
      { question: "Do you provide career support?", answer: "Career support such as resume guidance and interview preparation is offered as part of this program." },
    ],
  },
  {
    id: "react-development",
    slug: "react-development",
    order: 6,
    title: "React.js Development",
    shortDescription: "Component-driven UI development with modern React.",
    description:
      "Learn to build fast, maintainable user interfaces with modern React — components, hooks, state management and working with real APIs.",
    category: "Frontend Development",
    categorySlug: "frontend-development",
    level: "Beginner",
    levelLabel: "Beginner → Intermediate",
    duration: "2–3 Months (sample)",
    durationBand: "Medium (2–4 Months)",
    modes: ["Live Online"],
    featured: false,
    popular: true,
    accent: "primary",
    initials: "RJS",
    technologies: ["React", "JavaScript", "JSX", "React Router", "Git"],
    prerequisites: ["Basic HTML, CSS and JavaScript (sample)"],
    outcomes: [
      "Build component-driven UIs",
      "Manage state and props effectively",
      "Work with React Router",
      "Consume REST APIs from React",
      "Debug React applications",
    ],
    modules: [
      {
        title: "Module 01 — Foundations",
        duration: "2 Weeks (sample)",
        items: [
          { type: "lesson", title: "JSX and components" },
          { type: "lesson", title: "Props and state" },
          { type: "assignment", title: "Build a component library" },
        ],
      },
      {
        title: "Module 02 — Core Development",
        duration: "3 Weeks (sample)",
        items: [
          { type: "lesson", title: "Hooks in depth" },
          { type: "lesson", title: "Routing with React Router" },
          { type: "lesson", title: "Consuming REST APIs" },
          { type: "assignment", title: "Build a data-driven app" },
        ],
      },
      {
        title: "Module 03 — Advanced & Project Work",
        duration: "3 Weeks (sample)",
        items: [
          { type: "lesson", title: "Performance and code organization" },
          { type: "project", title: "Capstone: React application (example project)" },
        ],
      },
    ],
    projects: [
      { title: "Admin Dashboard", problem: "Operational visibility for internal teams.", tech: "React, REST APIs", outcome: "Data tables, charts and role-based views (example project)." },
    ],
    certification,
    faqs: [
      { question: "Do I need to know JavaScript first?", answer: "Basic HTML, CSS and JavaScript are recommended before starting." },
      { question: "Is this course project-based?", answer: "Yes, it includes hands-on assignments and a capstone project." },
    ],
  },
  {
    id: "nextjs-development",
    slug: "nextjs-development",
    order: 5,
    title: "Next.js Development",
    shortDescription: "Production-grade React applications with the Next.js framework.",
    description:
      "Go beyond React basics to build production-style applications with the Next.js App Router — routing, layouts, Server Components and deployment.",
    category: "Frontend Development",
    categorySlug: "frontend-development",
    level: "Intermediate",
    levelLabel: "Intermediate",
    duration: "6–8 Weeks (sample)",
    durationBand: "Short (Up to 2 Months)",
    modes: ["Live Online"],
    featured: false,
    popular: false,
    accent: "secondary",
    initials: "NJS",
    technologies: ["Next.js", "React", "Server Components", "Tailwind CSS"],
    prerequisites: ["Working knowledge of React (sample)"],
    outcomes: [
      "Build server-rendered React applications",
      "Use the App Router and Server Components",
      "Implement routing and layouts",
      "Optimize performance and SEO",
      "Deploy a Next.js application",
    ],
    modules: [
      {
        title: "Module 01 — Foundations",
        duration: "2 Weeks (sample)",
        items: [
          { type: "lesson", title: "App Router fundamentals" },
          { type: "lesson", title: "Server vs Client Components" },
          { type: "assignment", title: "Build a routed multi-page app" },
        ],
      },
      {
        title: "Module 02 — Core Development",
        duration: "3 Weeks (sample)",
        items: [
          { type: "lesson", title: "Data fetching patterns" },
          { type: "lesson", title: "Layouts and metadata" },
          { type: "assignment", title: "Build a content-driven site" },
        ],
      },
      {
        title: "Module 03 — Advanced & Project Work",
        duration: "2 Weeks (sample)",
        items: [
          { type: "lesson", title: "Performance and deployment" },
          { type: "project", title: "Capstone: Next.js application (example project)" },
        ],
      },
    ],
    projects: [
      { title: "Marketing Website", problem: "A fast, SEO-friendly public website.", tech: "Next.js, Tailwind CSS", outcome: "A multi-page, server-rendered site (example project)." },
    ],
    certification,
    faqs: [
      { question: "Do I need to know React first?", answer: "Yes, working knowledge of React is expected before starting this course." },
      { question: "Is this course beginner friendly?", answer: "It's designed for learners who already know React and want to go further." },
    ],
  },
  {
    id: "python-development",
    slug: "python-development",
    order: 4,
    title: "Python Development",
    shortDescription: "Backend development and scripting with Python.",
    description:
      "Build a solid foundation in Python and use it to build backend services, work with databases, and automate everyday tasks.",
    category: "Backend Development",
    categorySlug: "backend-development",
    level: "Beginner",
    levelLabel: "Beginner → Advanced",
    duration: "3–4 Months (sample)",
    durationBand: "Medium (2–4 Months)",
    modes: ["Classroom", "Live Online"],
    featured: false,
    popular: true,
    accent: "primary",
    initials: "PY",
    technologies: ["Python", "Flask", "Django", "SQL", "Git"],
    prerequisites: ["No prior coding experience required (sample)"],
    outcomes: [
      "Write clean, structured Python code",
      "Build backend services with Flask and Django",
      "Work with SQL databases",
      "Build and consume APIs",
      "Write and run tests",
    ],
    modules: [
      {
        title: "Module 01 — Foundations",
        duration: "3 Weeks (sample)",
        items: [
          { type: "lesson", title: "Python syntax and data structures" },
          { type: "lesson", title: "Functions and modules" },
          { type: "assignment", title: "Build a command-line tool" },
        ],
      },
      {
        title: "Module 02 — Core Development",
        duration: "5 Weeks (sample)",
        items: [
          { type: "lesson", title: "Building APIs with Flask" },
          { type: "lesson", title: "Working with SQL databases" },
          { type: "assignment", title: "Build a backend service" },
        ],
      },
      {
        title: "Module 03 — Advanced & Project Work",
        duration: "4 Weeks (sample)",
        items: [
          { type: "lesson", title: "Introduction to Django" },
          { type: "lesson", title: "Testing and debugging" },
          { type: "project", title: "Capstone: Python backend service (example project)" },
        ],
      },
    ],
    projects: [
      { title: "Inventory API", problem: "Tracking stock across locations.", tech: "Python, Flask, SQL", outcome: "A working REST API with a database (example project)." },
    ],
    certification,
    faqs: [
      { question: "Is this course beginner friendly?", answer: "Yes, no prior coding experience is required." },
      { question: "Will I learn both Flask and Django?", answer: "Yes, the course introduces both, with Flask covered in more depth." },
    ],
  },
  {
    id: "ai-generative-ai",
    slug: "ai-generative-ai",
    order: 3,
    title: "AI & Generative AI",
    shortDescription: "Applied AI tooling, prompting and integration patterns.",
    description:
      "A practical, applied introduction to working with large language models — prompting, retrieval and integrating AI features into real applications.",
    category: "AI & Generative AI",
    categorySlug: "ai-generative-ai",
    level: "Intermediate",
    levelLabel: "Intermediate",
    duration: "2–3 Months (sample)",
    durationBand: "Medium (2–4 Months)",
    modes: ["Live Online"],
    featured: true,
    popular: false,
    accent: "secondary",
    initials: "AI",
    technologies: ["Python", "LLM APIs", "Prompt Engineering", "Vector Databases"],
    prerequisites: ["Basic Python (sample)"],
    outcomes: [
      "Apply LLM APIs to real use cases",
      "Design effective prompts",
      "Understand vector databases and retrieval",
      "Integrate AI features into applications",
      "Evaluate AI output for practical use",
    ],
    modules: [
      {
        title: "Module 01 — Foundations",
        duration: "2 Weeks (sample)",
        items: [
          { type: "lesson", title: "How large language models work" },
          { type: "lesson", title: "Prompt engineering fundamentals" },
          { type: "assignment", title: "Build a prompt-driven script" },
        ],
      },
      {
        title: "Module 02 — Core Development",
        duration: "4 Weeks (sample)",
        items: [
          { type: "lesson", title: "Working with LLM APIs" },
          { type: "lesson", title: "Retrieval and vector databases" },
          { type: "assignment", title: "Build a small retrieval-based tool" },
        ],
      },
      {
        title: "Module 03 — Advanced & Project Work",
        duration: "3 Weeks (sample)",
        items: [
          { type: "lesson", title: "Evaluating and improving AI output" },
          { type: "project", title: "Capstone: AI-powered application (example project)" },
        ],
      },
    ],
    projects: [
      { title: "AI-Powered Application", problem: "Applying AI to a real workflow.", tech: "Python, LLM APIs", outcome: "An assistant-style feature with practical constraints (example project)." },
    ],
    certification,
    faqs: [
      { question: "Do I need a machine learning background?", answer: "No, this course focuses on applying existing AI tools rather than building models from scratch." },
      { question: "Is prior Python experience needed?", answer: "Basic Python is expected before starting this course." },
    ],
  },
  {
    id: "data-analytics",
    slug: "data-analytics",
    order: 2,
    title: "Data Analytics",
    shortDescription: "Analyze and visualize data to support real decisions.",
    description:
      "Learn to clean, analyze and visualize data using Python and SQL, and communicate findings clearly through practical, real-world datasets.",
    category: "Data Analytics",
    categorySlug: "data-analytics",
    level: "Beginner",
    levelLabel: "Beginner → Intermediate",
    duration: "3 Months (sample)",
    durationBand: "Medium (2–4 Months)",
    modes: ["Classroom", "Live Online"],
    featured: false,
    popular: false,
    accent: "primary",
    initials: "DA",
    technologies: ["Python", "SQL", "Pandas", "Data Visualization"],
    prerequisites: ["No prior coding experience required (sample)"],
    outcomes: [
      "Clean and prepare raw data",
      "Analyze data with Python and SQL",
      "Build clear visualizations",
      "Communicate insights effectively",
      "Work with real-world datasets",
    ],
    modules: [
      {
        title: "Module 01 — Foundations",
        duration: "3 Weeks (sample)",
        items: [
          { type: "lesson", title: "Data types and SQL basics" },
          { type: "lesson", title: "Python for data analysis" },
          { type: "assignment", title: "Clean a sample dataset" },
        ],
      },
      {
        title: "Module 02 — Core Development",
        duration: "5 Weeks (sample)",
        items: [
          { type: "lesson", title: "Working with Pandas" },
          { type: "lesson", title: "Data visualization" },
          { type: "assignment", title: "Build an analysis report" },
        ],
      },
      {
        title: "Module 03 — Advanced & Project Work",
        duration: "4 Weeks (sample)",
        items: [
          { type: "lesson", title: "Communicating insights" },
          { type: "project", title: "Capstone: data analytics project (example project)" },
        ],
      },
    ],
    projects: [
      { title: "Analytics Dashboard", problem: "Turning raw data into decisions.", tech: "Python, SQL, Charting", outcome: "Interactive charts and filterable reports (example project)." },
    ],
    certification,
    faqs: [
      { question: "Is this course beginner friendly?", answer: "Yes, no prior coding experience is required." },
      { question: "Will I work with real datasets?", answer: "Yes, assignments and the capstone use practical, real-world-style datasets." },
    ],
  },
  {
    id: "cloud-devops",
    slug: "cloud-devops",
    order: 1,
    title: "Cloud & DevOps",
    shortDescription: "CI/CD, containers and cloud infrastructure fundamentals.",
    description:
      "Build practical skills in cloud infrastructure, containerization and CI/CD pipelines used to deploy and operate real applications.",
    category: "Cloud & DevOps",
    categorySlug: "cloud-devops",
    level: "Intermediate",
    levelLabel: "Intermediate",
    duration: "3 Months (sample)",
    durationBand: "Medium (2–4 Months)",
    modes: ["Live Online"],
    featured: true,
    popular: false,
    accent: "secondary",
    initials: "CD",
    technologies: ["AWS", "Docker", "CI/CD", "Linux", "Git"],
    prerequisites: ["Basic command-line familiarity (sample)"],
    outcomes: [
      "Understand core cloud concepts",
      "Work with containers using Docker",
      "Set up CI/CD pipelines",
      "Manage infrastructure basics",
      "Monitor and troubleshoot deployments",
    ],
    modules: [
      {
        title: "Module 01 — Foundations",
        duration: "2 Weeks (sample)",
        items: [
          { type: "lesson", title: "Cloud computing fundamentals" },
          { type: "lesson", title: "Linux and the command line" },
          { type: "assignment", title: "Set up a cloud environment" },
        ],
      },
      {
        title: "Module 02 — Core Development",
        duration: "5 Weeks (sample)",
        items: [
          { type: "lesson", title: "Containers with Docker" },
          { type: "lesson", title: "CI/CD pipeline basics" },
          { type: "assignment", title: "Containerize an application" },
        ],
      },
      {
        title: "Module 03 — Advanced & Project Work",
        duration: "4 Weeks (sample)",
        items: [
          { type: "lesson", title: "Monitoring and troubleshooting" },
          { type: "project", title: "Capstone: CI/CD deployment pipeline (example project)" },
        ],
      },
    ],
    projects: [
      { title: "Real-Time Web Application", problem: "Live, multi-user experiences.", tech: "Node.js, WebSockets, Docker", outcome: "A containerized app with an automated deployment pipeline (example project)." },
    ],
    certification,
    faqs: [
      { question: "Do I need prior cloud experience?", answer: "No, but basic command-line familiarity is recommended." },
      { question: "Which cloud provider is used?", answer: "The course uses AWS for core concepts and hands-on practice." },
    ],
  },
];

// Long-form content (overview, syllabus, FAQs…) is layered over the base
// catalog records by slug — see courseSyllabus.js.
export const courses = baseCourses.map((course) => ({ ...course, ...courseSyllabus[course.slug] }));

export function getCourseBySlug(slug) {
  return courses.find((course) => course.slug === slug);
}

/** "4–6 Months (sample)" -> "4–6 Months" — the sample tag is explained once on the page instead of on every tile. */
export function displayDuration(course) {
  return (course.duration ?? "").replace(" (sample)", "");
}

// Tools shared by almost every course say nothing about relatedness.
const GENERIC_TECH = new Set(["Git", "REST APIs"]);

/**
 * Curated "next step" slugs (see courseSyllabus.js) come first, then any gaps
 * are filled by relevance: same category, then shared (non-generic) technologies.
 */
export function getRelatedCourses(course, limit = 3) {
  const curated = (course.related ?? [])
    .map((slug) => courses.find((candidate) => candidate.slug === slug))
    .filter(Boolean);

  const scored = courses
    .filter((candidate) => candidate.slug !== course.slug && !curated.includes(candidate))
    .map((candidate) => {
      const sharedTech = candidate.technologies.filter(
        (tech) => !GENERIC_TECH.has(tech) && course.technologies.includes(tech)
      ).length;
      const score = (candidate.categorySlug === course.categorySlug ? 3 : 0) + sharedTech;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.candidate);

  return [...curated, ...scored].slice(0, limit);
}
