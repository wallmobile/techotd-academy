// Node.js-runtime half of src/instrumentation.js (kept separate so the Edge
// bundle never sees process.exit). Checks the deployment configuration and
// reports it in the server log using variable NAMES and statuses only - never
// values (several are secrets).
//
//  - warnings: a degraded-but-working state (an optional integration that is
//    half configured, a missing optional setting);
//  - errors: a misconfiguration that would break or endanger the deployment
//    (malformed site URL, plain-HTTP origin for a Secure-cookie site, a
//    database URL for another engine). In production the process EXITS with a
//    non-zero status so a supervisor / deploy pipeline sees the failure at
//    deploy time instead of users seeing it (just throwing would leave Next
//    running and answering every request with HTTP 500); in development it is
//    only logged.
import { inspectEnvironment } from "@/lib/config";

export function checkConfiguration() {
  // The literal member expression below is inlined by Next at BUILD time (the
  // computed key in config.js reads the real runtime environment), so comparing
  // the two reveals a build made with a different site URL than the one running.
  const report = inspectEnvironment(process.env, { builtSiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "" });

  for (const warning of report.warnings) console.warn(`[config] ${warning}`);
  for (const error of report.errors) console.error(`[config] ERROR: ${error}`);

  if (!report.ok && report.production) {
    console.error(`[config] Refusing to start: ${report.errors.length} configuration error(s), see above.`);
    process.exit(1);
  }
}
