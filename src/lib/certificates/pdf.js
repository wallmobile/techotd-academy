// Certificate PDF generation (Phase 10.5) — a small, dependency-free PDF 1.4
// writer: one A4-landscape page, built-in Helvetica fonts (no embedding),
// vector border and text. Output is a real, downloadable PDF built from the
// database record at request time, so a revoked certificate can simply
// refuse to render and nothing stale is stored.
//
// Limitation: built-in PDF fonts use WinAnsi/Latin-1. Characters outside
// that range in a name or course title render as "?" in the PDF (the
// database record and the verification page keep the exact text).
//
// Deliberately NOT drawn: signatures, seals, accreditation or QR codes —
// none are configured. The verification URL is printed as text.

const PAGE_W = 842;
const PAGE_H = 595;

// Helvetica advance widths (1/1000 em) for ASCII 32..126, for centering.
const HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667,
  611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833,
  556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

function toLatin1(text) {
  let out = "";
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    out += code >= 32 && code <= 255 && code !== 127 ? ch : "?";
  }
  return out;
}

function textWidth(text, size, bold = false) {
  let w = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    w += (code >= 32 && code <= 126 ? HELV[code - 32] : 556) * size / 1000;
  }
  return bold ? w * 1.07 : w;
}

function escapePdfText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Shrinks the font until the text fits `maxWidth`, truncating with "..." as a last resort.
function fit(text, size, minSize, maxWidth, bold = false) {
  let s = size;
  let t = toLatin1(text);
  while (s > minSize && textWidth(t, s, bold) > maxWidth) s -= 1;
  if (textWidth(t, s, bold) > maxWidth) {
    while (t.length > 4 && textWidth(`${t}...`, s, bold) > maxWidth) t = t.slice(0, -1);
    t = `${t}...`;
  }
  return { text: t, size: s };
}

function line(font, size, text, bold = false, color = "0.059 0.09 0.165") {
  const w = textWidth(text, size, bold);
  const x = Math.max(40, (PAGE_W - w) / 2);
  return { font, size, text, x, color };
}

export function buildCertificatePdf({ studentName, courseTitle, certificateNumber, issuedAt, verifyUrl, issuer = "TechOTD Academy" }) {
  const name = fit(studentName, 40, 18, 640);
  const course = fit(courseTitle, 26, 14, 640);
  const dateText = (() => {
    const d = new Date(`${String(issuedAt).replace(" ", "T")}Z`);
    return Number.isNaN(d.getTime())
      ? String(issuedAt)
      : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  })();

  const rows = [
    { y: 478, ...line("F2", 30, "TechOTD Academy", true, "0.145 0.388 0.922") },
    { y: 452, ...line("F1", 13, "Learn. Build. Grow.", false, "0.486 0.227 0.929") },
    { y: 392, ...line("F2", 34, "Certificate of Completion", true) },
    { y: 345, ...line("F1", 14, "This is to certify that", false, "0.39 0.45 0.55") },
    { y: 290, font: "F1", size: name.size, text: name.text, x: Math.max(40, (PAGE_W - textWidth(name.text, name.size)) / 2), color: "0.059 0.09 0.165" },
    { y: 250, ...line("F1", 14, "has successfully completed the course", false, "0.39 0.45 0.55") },
    { y: 208, font: "F2", size: course.size, text: course.text, x: Math.max(40, (PAGE_W - textWidth(course.text, course.size, true)) / 2), color: "0.145 0.388 0.922" },
    { y: 150, ...line("F1", 12, toLatin1(`Issued on ${dateText}`), false) },
    { y: 128, ...line("F1", 12, toLatin1(`Certificate number: ${certificateNumber}`), false) },
    { y: 96, ...line("F1", 10, toLatin1(`Issued by ${issuer}`), false, "0.39 0.45 0.55") },
    { y: 78, ...line("F1", 9, toLatin1(`Verify this certificate: ${verifyUrl}`), false, "0.39 0.45 0.55") },
  ];

  let content = "";
  content += "0.145 0.388 0.922 RG 4 w 24 24 794 547 re S\n";
  content += "0.486 0.227 0.929 RG 1 w 34 34 774 527 re S\n";
  for (const r of rows) {
    content += `BT ${r.color} rg /${r.font} ${r.size} Tf ${r.x.toFixed(2)} ${r.y} Td (${escapePdfText(toLatin1(r.text))}) Tj ET\n`;
  }

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`,
    `<< /Title (${escapePdfText(toLatin1(`Certificate ${certificateNumber}`))}) /Producer (TechOTD Academy) >>`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
