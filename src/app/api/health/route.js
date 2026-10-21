import { db } from "@/lib/db/client";

// Liveness + database readiness for load balancers, uptime monitors and
// post-deploy smoke tests. Public by design and therefore minimal: it reports
// only ok / unavailable - no versions, paths, configuration or error details.
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function GET() {
  try {
    // A real round trip, plus proof that the schema exists (not just a file).
    const ready =
      (await db.get("SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('users', 'sessions', 'catalog_courses')")).c === 3;
    if (!ready) return Response.json({ status: "unavailable" }, { status: 503, headers });
    return Response.json({ status: "ok" }, { headers });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
