import { notFound } from "next/navigation";
import { getPublicVerification } from "@/lib/certificates/verify";
import { getClientIp, hitLimit } from "@/lib/rateLimit";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// Public, unauthenticated, and deliberately not indexed or cached: it
// reveals the holder's name only to someone who already holds the
// unguessable verification link.
export const metadata = {
  title: "Certificate Verification",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function formatDate(value) {
  const d = new Date(`${String(value).replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function VerifyCertificatePage({ params }) {
  const { token } = await params;

  // Abuse control: bounded lookups per client IP (shared across processes on
  // this database). Over the limit, no lookup is performed at all.
  const ip = await getClientIp();
  if (!(await hitLimit("verifyCertificate", ip)).allowed) {
    return (
      <Container className="py-16">
        <Card className="mx-auto w-full max-w-xl text-center">
          <h1 className="text-xl font-semibold tracking-tight text-dark">Too many requests</h1>
          <p className="mt-2 text-sm text-muted">Please wait a minute and try again.</p>
        </Card>
      </Container>
    );
  }

  const result = await getPublicVerification(token);
  if (!result) notFound();

  return (
    <Container className="py-16">
      <Card className="mx-auto w-full max-w-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{result.issuer}</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-dark">Certificate verification</h1>
          </div>
          <Badge variant={result.valid ? "success" : "danger"}>{result.valid ? "Valid" : "Revoked"}</Badge>
        </div>

        <p role="status" className="mt-4 text-sm text-text">
          {result.valid
            ? "This certificate was issued by TechOTD Academy and is valid."
            : "This certificate was issued by TechOTD Academy but has been revoked and is no longer valid."}
        </p>

        <dl className="mt-4 flex flex-col gap-2.5 text-sm">
          <Row label="Certificate number">{result.certificateNumber}</Row>
          <Row label="Awarded to">{result.holderName}</Row>
          <Row label="Course">{result.courseTitle}</Row>
          <Row label="Issued">{formatDate(result.issuedAt)}</Row>
        </dl>
      </Card>
    </Container>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-text">{children}</dd>
    </div>
  );
}
