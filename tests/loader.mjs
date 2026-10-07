// Resolver hooks for the test run: "@/x" -> src/x (same rule as
// scripts/alias-loader.mjs) and the Next.js runtime modules that only
// work inside a request (next/headers, next/cache, next/navigation) ->
// small in-memory stubs. Everything else — the DB layer, session logic,
// domain functions, server actions — is the REAL application code.
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_ROOT = pathToFileURL(path.join(ROOT, "src") + path.sep);
const STUBS = {
  "next/headers": "headers.mjs",
  "next/cache": "cache.mjs",
  "next/navigation": "navigation.mjs",
};

export function resolve(specifier, context, nextResolve) {
  if (STUBS[specifier]) {
    return nextResolve(pathToFileURL(path.join(ROOT, "tests", "stubs", STUBS[specifier])).href, context);
  }
  if (specifier === "next/server") return nextResolve("next/server.js", context);
  if (specifier.startsWith("@/")) {
    const withExt = specifier.endsWith(".js") ? specifier.slice(2) : `${specifier.slice(2)}.js`;
    return nextResolve(new URL(withExt, SRC_ROOT).href, context);
  }
  return nextResolve(specifier, context);
}
