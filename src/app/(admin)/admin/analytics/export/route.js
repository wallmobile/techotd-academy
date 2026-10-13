import { buildExport } from "@/lib/analytics/service";

// CSV export (ADMIN / SUPER_ADMIN only — enforced inside buildExport, because
// route handlers aren't wrapped by the (admin) layout guard). Aggregates
// only; bounded; never cached; not a public URL.
export async function GET(request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const result = await buildExport({ type: params.type, input: params });
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

  if (!result.ok) {
    const status = result.reason === "forbidden" ? 403 : 400;
    return new Response(result.message || "Request not allowed.", { status, headers });
  }
  return new Response(result.csv, {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
