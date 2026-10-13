// Deterministic skill matching helpers (Phase 10.9). Pure functions — no AI,
// no database — so job-fit and recommendation fallbacks are explainable and
// testable.

// "Node.js" / "NodeJS" / "node js" -> "node"; "React.js" -> "react";
// "Tailwind CSS" -> "tailwindcss"; "C++" -> "c++".
export function skillKey(raw) {
  let key = String(raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, "");
  if (key.length > 4 && key.endsWith("js")) key = key.slice(0, -2);
  return key;
}

// "React, CSS ; Node.js\nGit" -> ["React", "CSS", "Node.js", "Git"] (deduped, bounded).
export function parseSkillList(text, max = 30) {
  const seen = new Set();
  const out = [];
  for (const part of String(text ?? "").split(/[,;\n/|]+/)) {
    const label = part.trim().slice(0, 40);
    const key = skillKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= max) break;
  }
  return out;
}

const STOPWORDS = new Set([
  "to", "of", "in", "on", "at", "is", "it", "an", "be", "my", "me", "or", "as", "so", "do", "am", "we", "us", "up",
  "the", "and", "for", "with", "want", "learn", "learning", "become", "build", "building", "interested", "about", "into", "like",
  "from", "that", "this", "have", "need", "get", "how", "can", "would", "your", "you", "are", "course", "courses", "skills", "career",
  "job", "work", "working", "start", "starting", "some", "something", "more", "also", "any", "please", "help",
]);

export function tokenizeInterests(text, max = 20) {
  const seen = new Set();
  const tokens = [];
  for (const raw of String(text ?? "").toLowerCase().split(/[^a-z0-9+#.]+/)) {
    const t = raw.replace(/^\.+|\.+$/g, "");
    if (t.length < 2 || STOPWORDS.has(t) || seen.has(t)) continue;
    seen.add(t);
    tokens.push(t);
    if (tokens.length >= max) break;
  }
  return tokens;
}
