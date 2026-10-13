import { getCertificatePdfForAdmin } from "@/lib/certificates/service";

// Route handlers aren't wrapped by the (admin) layout guard; authorization
// (ADMIN / SUPER_ADMIN) is enforced inside getCertificatePdfForAdmin().
export async function GET(_request, { params }) {
  const { "certificate-id": certificateId } = await params;
  const result = await getCertificatePdfForAdmin(certificateId);
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!result.ok) {
    const status = result.reason === "forbidden" ? 403 : result.reason === "revoked" ? 410 : 404;
    return new Response(result.reason === "revoked" ? "This certificate has been revoked." : "Not found", { status, headers });
  }
  return new Response(result.pdf, {
    headers: {
      ...headers,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
