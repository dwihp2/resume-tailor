/**
 * Builds a tiny, valid, single-page PDF from lines of text so tests never need
 * a real resume checked into the repository. Offsets in the xref table are byte
 * offsets, so the input must stay ASCII — enforced below.
 */
export const RESUME_LINES = [
  "Muhammad Example",
  "SUMMARY",
  "Frontend engineer with six years of experience building internal tools.",
  "EXPERIENCE",
  "Rushowl - Frontend Engineer",
  "- Built an accounting module that cut manual payment work by 20%",
  "- Integrated VoIP calling into the internal tools dashboard using Sendbird",
  "- Added Google Maps tracking for driver oversight",
  "Geniebook - Frontend Engineer",
  "- Launched AI marking and commenting features providing feedback in 32 seconds",
  "PROJECTS",
  "- Rebuilt the reporting dashboard in React and TypeScript backed by PostgreSQL through Prisma, cutting report load time by 32 seconds for a team of 4",
  "EDUCATION",
  "BSc Computer Science",
];

/**
 * A real resume PDF wraps long lines, and the extractor then hands back one
 * bullet as several lines. The fixture must wrap for the same reason: text
 * drawn past the page edge is dropped by the extractor, and a bullet that long
 * would be a fixture nobody could produce by hand.
 */
function wrap(line, width = 92) {
  if (line.length <= width) return [line];
  const words = line.split(" ");
  const out = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > width) {
      out.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) out.push(current);
  return out;
}

export function buildResumePdf(lines = RESUME_LINES) {
  const wrappedLines = lines.flatMap((line) => wrap(line));
  for (const line of wrappedLines) {
    for (const character of line) {
      if (character.codePointAt(0) > 127) {
        throw new Error(`Fixture lines must be ASCII: ${line}`);
      }
    }
  }

  const escape = (text) => text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const content = [
    "BT",
    "/F1 11 Tf",
    "14 TL",
    "40 752 Td",
    ...wrappedLines.flatMap((line, index) =>
      index === 0 ? [`(${escape(line)}) Tj`] : ["T*", `(${escape(line)}) Tj`],
    ),
    "ET",
    "",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
