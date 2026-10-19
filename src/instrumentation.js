// Runs once when the Next.js server starts (before it accepts requests).
// The configuration check is Node.js-only; see src/instrumentation-node.js.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkConfiguration } = await import("./instrumentation-node");
    checkConfiguration();
  }
}
