// Minimal Node.js module customization hook so a plain `node` script can
// import the app's own "@/..." path alias (defined in jsconfig.json for
// Next.js/webpack) the exact same way the application does — without
// duplicating any application logic in the script.
//
// This resolves "@/x" to "<project-root>/src/x" and lets Node's default
// resolver handle everything else unchanged. Registered via
// `module.register()` (stable in Node >=20.6 / used here on Node >=22,
// this project's required version) from scripts/setup-trainer.mjs — it is
// never loaded by the Next.js app itself.

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC_ROOT = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src") + path.sep
);

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    // The app's own source always omits the extension (Next.js's bundler
    // resolves it); plain Node's ESM loader requires it explicitly.
    const withExtension = specifier.endsWith(".js") ? specifier.slice(2) : `${specifier.slice(2)}.js`;
    const rewritten = new URL(withExtension, SRC_ROOT).href;
    return nextResolve(rewritten, context);
  }
  return nextResolve(specifier, context);
}
