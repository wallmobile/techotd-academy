import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Certificate Not Found",
  robots: { index: false, follow: false },
};

// Identical for unknown, malformed and mistyped identifiers — it confirms
// nothing about whether any certificate or student exists.
export default function VerifyCertificateNotFound() {
  return (
    <Container className="py-16">
      <Card className="mx-auto w-full max-w-xl text-center">
        <h1 className="text-xl font-semibold tracking-tight text-dark">Certificate not found</h1>
        <p className="mt-2 text-sm text-muted">
          We couldn&apos;t find a certificate for this link. Please check the verification link printed on the certificate and try again.
        </p>
        <div className="mt-5">
          <Button href="/">Go to TechOTD Academy</Button>
        </div>
      </Card>
    </Container>
  );
}
