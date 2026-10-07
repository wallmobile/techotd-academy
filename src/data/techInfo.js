/**
 * Plain-language one-liners for every technology that appears on a course
 * page: what it is, and why you'll use it. Keeps the tech stack section
 * useful for beginners who don't know the names yet.
 */
export const techInfo = {
  HTML: "The structure of every web page — headings, text, images and forms.",
  CSS: "Controls how pages look: colours, spacing, layout and responsiveness.",
  JavaScript: "The language that makes pages interactive, in the browser and on servers.",
  React: "A library for building interfaces out of small, reusable components.",
  JSX: "Write HTML-like markup inside JavaScript to describe your React UI.",
  "React Router": "Lets a React app have multiple pages without full reloads.",
  "Node.js": "Runs JavaScript outside the browser, so you can build servers and tools.",
  Express: "A lightweight Node.js framework for building web servers and APIs.",
  MongoDB: "A flexible database that stores data as JSON-like documents.",
  "REST APIs": "The standard way a frontend and backend talk to each other over HTTP.",
  Git: "Tracks every change to your code and makes teamwork possible.",
  "Next.js": "A React framework for fast, search-friendly production websites.",
  "Server Components": "React components that run on the server, sending less code to the browser.",
  "Tailwind CSS": "Style pages quickly with small utility classes instead of custom CSS files.",
  Python: "A beginner-friendly language used for backends, automation, data and AI.",
  Flask: "A minimal Python framework for building web apps and APIs.",
  Django: "A full-featured Python framework with batteries included: admin, auth and ORM.",
  SQL: "The language for asking questions of relational databases.",
  "LLM APIs": "Services that let your code use large language models like a chat assistant.",
  "Prompt Engineering": "Writing instructions that get reliable, useful answers from AI models.",
  "Vector Databases": "Store text as numbers so you can search by meaning, not just keywords.",
  Pandas: "A Python library for cleaning, reshaping and analysing tabular data.",
  "Data Visualization": "Turn numbers into charts that make patterns easy to see.",
  AWS: "Amazon's cloud platform — rent servers, storage and networking on demand.",
  Docker: "Packages an app and everything it needs into a container that runs anywhere.",
  "CI/CD": "Automatically tests and deploys your code every time you push a change.",
  Linux: "The operating system behind most servers; you'll work from its command line.",
};

export function describeTech(name) {
  return techInfo[name] ?? "";
}

/** Glossary grouping for the Resources page. */
export const techCategories = {
  HTML: "Frontend",
  CSS: "Frontend",
  JavaScript: "Frontend",
  React: "Frontend",
  JSX: "Frontend",
  "React Router": "Frontend",
  "Next.js": "Frontend",
  "Server Components": "Frontend",
  "Tailwind CSS": "Frontend",
  "Node.js": "Backend",
  Express: "Backend",
  "REST APIs": "Backend",
  Python: "Backend",
  Flask: "Backend",
  Django: "Backend",
  MongoDB: "Data",
  SQL: "Data",
  Pandas: "Data",
  "Data Visualization": "Data",
  "Vector Databases": "Data",
  "LLM APIs": "AI",
  "Prompt Engineering": "AI",
  AWS: "Cloud & Tools",
  Docker: "Cloud & Tools",
  "CI/CD": "Cloud & Tools",
  Linux: "Cloud & Tools",
  Git: "Cloud & Tools",
};
