// Environment / deployment configuration checks (Phase 10.12).
//
// Pure functions: they read an env object and return names + statuses only.
// NEVER put a variable's VALUE into a message, a return value or a log line -
// several of these are secrets (API keys, CRON_SECRET) and the tests assert
// that no value leaks. Used at server start (src/instrumentation.js) and by the
// database client for its path rules.

const PRODUCTION_DEFAULT_SITE = "https://academy.techotd.in";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const filled = (env, name) => typeof env[name] === "string" && env[name].trim() !== "";

/**
 * Interprets DATABASE_URL: a PostgreSQL connection string
 * (postgres://user:password@host:5432/dbname?sslmode=require). There is no
 * default: without it the application cannot store anything. Anything else
 * (an old SQLite file: URL, mysql://, https://...) is a misconfiguration.
 * Error messages never include the value (it contains the password).
 * Returns { ok: true, url, host, local, sslmode } | { ok: false, error }.
 */
export function parseDatabaseUrl(url) {
  if (url === undefined || url === null || String(url).trim() === "") {
    return { ok: false, error: "DATABASE_URL is not set. Set it to a PostgreSQL connection string (postgres://user:password@host:5432/dbname)." };
  }
  const value = String(url).trim();
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "DATABASE_URL is not a valid connection URL. Expected postgres://user:password@host:5432/dbname (special characters in the password must be percent-encoded)." };
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return { ok: false, error: "DATABASE_URL must be a PostgreSQL connection string (postgres://...). SQLite file: URLs and other database servers are not supported." };
  }
  if (!parsed.hostname) return { ok: false, error: "DATABASE_URL has no host." };
  if (parsed.pathname.length <= 1) return { ok: false, error: "DATABASE_URL has no database name (postgres://user:password@host:5432/dbname)." };
  return { ok: true, url: value, host: parsed.hostname, local: LOCAL_HOSTS.has(parsed.hostname), sslmode: parsed.searchParams.get("sslmode") };
}

/** Validates NEXT_PUBLIC_SITE_URL. Returns { ok, error?, https? , local? }. */
export function parseSiteUrl(value) {
  let url;
  try {
    url = new URL(String(value).trim());
  } catch {
    return { ok: false, error: "NEXT_PUBLIC_SITE_URL is not a valid absolute URL (expected e.g. https://staging.example.org)." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: "NEXT_PUBLIC_SITE_URL must start with https:// (or http:// for localhost)." };
  if (url.username || url.password) return { ok: false, error: "NEXT_PUBLIC_SITE_URL must not contain credentials." };
  if ((url.pathname && url.pathname !== "/") || url.search || url.hash) return { ok: false, error: "NEXT_PUBLIC_SITE_URL must be an origin only (no path, query or fragment)." };
  return { ok: true, https: url.protocol === "https:", local: LOCAL_HOSTS.has(url.hostname) };
}

/**
 * Inspects the environment. Returns
 *   { ok, production, errors: string[], warnings: string[], vars: { NAME: "present" | "missing" | "invalid" | "default" } }
 * `errors` are misconfigurations that would break or endanger the deployment
 * (the server refuses to start with them in production); `warnings` are
 * degraded-but-working states (an optional integration that is half set up).
 */
export function inspectEnvironment(env = process.env, { builtSiteUrl } = {}) {
  const production = env.NODE_ENV === "production";
  const errors = [];
  const warnings = [];
  const vars = {};
  const mark = (name, status) => {
    vars[name] = status;
  };

  // --- NEXT_PUBLIC_SITE_URL (read at BUILD time too: Next inlines NEXT_PUBLIC_*)
  if (!filled(env, "NEXT_PUBLIC_SITE_URL")) {
    mark("NEXT_PUBLIC_SITE_URL", "missing");
    if (production) {
      warnings.push(
        `NEXT_PUBLIC_SITE_URL is not set: canonical URLs, sitemap and robots fall back to ${PRODUCTION_DEFAULT_SITE}, and password-reset emails and absolute certificate links cannot be built. Set it to this deployment's https:// origin BEFORE building.`
      );
    }
  } else {
    const site = parseSiteUrl(env.NEXT_PUBLIC_SITE_URL);
    if (!site.ok) {
      mark("NEXT_PUBLIC_SITE_URL", "invalid");
      errors.push(site.error);
    } else {
      mark("NEXT_PUBLIC_SITE_URL", "present");
      if (production && !site.https && !site.local) {
        mark("NEXT_PUBLIC_SITE_URL", "invalid");
        errors.push("NEXT_PUBLIC_SITE_URL uses plain http:// for a non-local host. Session cookies are Secure in production, so browsers will not keep them and nobody could sign in. Serve the site over HTTPS.");
      }
    }
  }

  // --- build-time vs runtime site URL. Next inlines NEXT_PUBLIC_* when it BUILDS,
  // so sitemap, robots, canonical URLs, password-reset emails and certificate
  // links use the BUILD-time value whatever the runtime environment says.
  // `builtSiteUrl` is that inlined value (undefined = not checked, e.g. tests).
  if (builtSiteUrl !== undefined) {
    const built = String(builtSiteUrl).trim();
    const originOf = (v) => {
      try {
        return new URL(v).origin;
      } catch {
        return null;
      }
    };
    if (built && !parseSiteUrl(built).ok) {
      mark("NEXT_PUBLIC_SITE_URL", "invalid");
      errors.push("The NEXT_PUBLIC_SITE_URL this build was made with is not a valid origin, so every page that builds absolute URLs will fail. Rebuild with a valid https:// origin.");
    } else if (filled(env, "NEXT_PUBLIC_SITE_URL") && originOf(env.NEXT_PUBLIC_SITE_URL) !== (built ? originOf(built) : originOf(PRODUCTION_DEFAULT_SITE))) {
      mark("NEXT_PUBLIC_SITE_URL", "invalid");
      errors.push(
        `NEXT_PUBLIC_SITE_URL differs between build and runtime (this build uses ${built ? originOf(built) : `the built-in default ${PRODUCTION_DEFAULT_SITE}`}, the environment says ${originOf(env.NEXT_PUBLIC_SITE_URL) ?? "an invalid value"}). Next.js fixes NEXT_PUBLIC_* at build time: sitemap, canonical URLs, password-reset emails and certificate links would point at the wrong site. Rebuild with the intended value.`
      );
    }
  }

  // --- DATABASE_URL (PostgreSQL; no default)
  if (!filled(env, "DATABASE_URL")) {
    mark("DATABASE_URL", "missing");
    const message = "DATABASE_URL is not set. Set it to your PostgreSQL connection string (use the provider's pooled / serverless URL on serverless hosting).";
    if (production) errors.push(message);
    else warnings.push(message);
  } else {
    const dbUrl = parseDatabaseUrl(env.DATABASE_URL);
    if (!dbUrl.ok) {
      mark("DATABASE_URL", "invalid");
      errors.push(dbUrl.error);
    } else {
      mark("DATABASE_URL", "present");
      if (production && !dbUrl.local && !dbUrl.sslmode) {
        warnings.push("DATABASE_URL has no sslmode. Managed PostgreSQL services require TLS: append ?sslmode=require.");
      }
    }
  }

  // --- trusted proxy
  if (filled(env, "TRUSTED_PROXY_HOPS")) {
    const n = Number(env.TRUSTED_PROXY_HOPS);
    if (Number.isInteger(n) && n >= 0 && n <= 5) mark("TRUSTED_PROXY_HOPS", "present");
    else {
      mark("TRUSTED_PROXY_HOPS", "invalid");
      warnings.push("TRUSTED_PROXY_HOPS is not an integer from 0 to 5 and is ignored (the default of 1 proxy applies).");
    }
  } else {
    mark("TRUSTED_PROXY_HOPS", "default");
    if (production) warnings.push("TRUSTED_PROXY_HOPS is not set: assuming exactly one trusted reverse proxy appends X-Forwarded-For. Set 0 if the app is directly exposed, or the real number of proxies.");
  }

  // --- email (all three are needed to send anything)
  group(env, vars, warnings, {
    label: "Email (Resend)",
    names: ["EMAIL_PROVIDER", "RESEND_API_KEY", "EMAIL_FROM"],
    invalid: (e) => (filled(e, "EMAIL_PROVIDER") && e.EMAIL_PROVIDER !== "resend" ? ["EMAIL_PROVIDER (only 'resend' is supported)"] : []).concat(filled(e, "EMAIL_FROM") && !String(e.EMAIL_FROM).includes("@") ? ["EMAIL_FROM (no email address)"] : []),
    consequence: "no email is sent (in-app notifications still work) and password reset by email is unavailable",
  });

  // --- new-lead alert recipient (optional; needs the email provider above)
  if (filled(env, "LEAD_ALERT_EMAIL")) {
    if (!/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/.test(String(env.LEAD_ALERT_EMAIL).trim())) {
      mark("LEAD_ALERT_EMAIL", "invalid");
      warnings.push("LEAD_ALERT_EMAIL is not a single valid email address: new-lead alert emails are not sent.");
    } else {
      mark("LEAD_ALERT_EMAIL", "present");
      if (["EMAIL_PROVIDER", "RESEND_API_KEY", "EMAIL_FROM"].some((n) => !filled(env, n))) {
        warnings.push("LEAD_ALERT_EMAIL is set but email (Resend) is not fully configured: new-lead alert emails are not sent.");
      }
    }
  } else {
    mark("LEAD_ALERT_EMAIL", "missing");
  }

  // --- AI
  group(env, vars, warnings, {
    label: "AI assistant",
    names: ["AI_PROVIDER", "ANTHROPIC_API_KEY", "AI_MODEL"],
    invalid: (e) => (filled(e, "AI_PROVIDER") && e.AI_PROVIDER !== "anthropic" ? ["AI_PROVIDER (only 'anthropic' is supported)"] : []),
    consequence: "the learning assistant shows 'not available' (catalog recommendations and job-fit still work)",
  });
  for (const name of ["AI_MAX_OUTPUT_TOKENS", "AI_TIMEOUT_MS"]) {
    if (filled(env, name)) {
      if (Number.isFinite(Number(env[name]))) mark(name, "present");
      else {
        mark(name, "invalid");
        warnings.push(`${name} is not a number and the default is used.`);
      }
    }
  }

  // --- cron secret for POST /api/notifications/process
  if (filled(env, "CRON_SECRET")) {
    mark("CRON_SECRET", "present");
    if (String(env.CRON_SECRET).length < 16) warnings.push("CRON_SECRET is shorter than 16 characters; use a long random value.");
  } else {
    mark("CRON_SECRET", "missing");
  }

  // --- payment gateway: not implemented
  if (filled(env, "PAYMENT_PROVIDER") || filled(env, "PAYMENT_WEBHOOK_SECRET")) {
    mark("PAYMENT_PROVIDER", filled(env, "PAYMENT_PROVIDER") ? "present" : "missing");
    mark("PAYMENT_WEBHOOK_SECRET", filled(env, "PAYMENT_WEBHOOK_SECRET") ? "present" : "missing");
    warnings.push("PAYMENT_* is set but no payment gateway is integrated; online payments are not available.");
  }

  return { ok: errors.length === 0, production, errors, warnings, vars };
}

function group(env, vars, warnings, { label, names, invalid, consequence }) {
  const present = names.filter((n) => filled(env, n));
  for (const n of names) vars[n] = filled(env, n) ? "present" : "missing";
  const bad = invalid(env);
  for (const item of bad) vars[item.split(" ")[0]] = "invalid";
  if (present.length === 0) return;
  const missing = names.filter((n) => !filled(env, n));
  if (missing.length > 0 || bad.length > 0) {
    const parts = [];
    if (missing.length) parts.push(`missing ${missing.join(", ")}`);
    if (bad.length) parts.push(`invalid ${bad.join(", ")}`);
    warnings.push(`${label} is partly configured (${parts.join("; ")}): ${consequence}.`);
  }
}

/** Human-readable lines for the report (names and statuses only). */
export function formatReport(report) {
  const lines = [];
  for (const [name, status] of Object.entries(report.vars)) lines.push(`${name}: ${status}`);
  return lines;
}
