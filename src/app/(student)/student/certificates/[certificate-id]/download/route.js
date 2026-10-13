import { getMyCertificatePdf } from "@/lib/student/certificates";

// Route handlers aren't wrapped by the (student) layout guard, so ownership
// is enforced inside getMyCertificatePdf() (session student only).
export async function GET(_request, { params }) {
  const { "certificate-id": certificateId } = await params;
  const result = await getMyCertificatePdf(certificateId);
  if (!result.ok) {
    return new Response(result.reason === "revoked" ? "This certificate has been revoked." : "Not found", {
      status: result.reason === "revoked" ? 410 : 404,
      headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  return new Response(result.pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
