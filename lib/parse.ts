export type ParsedBullet = {
  section: string | null;
  text: string;
  order: number;
};

const BULLET_GLYPHS = /^[-•*▪▫●○◦·‣⁃º+>»]\s*/;
const NUMBERED = /^\(?\d{1,2}[.)]\s+/;
const DATE_RANGE = /\b(19|20)\d{2}\b.*\b(19|20)\d{2}\b|\b(present|current)\b/i;

const SECTION_NAMES = [
  "summary",
  "profile",
  "objective",
  "experience",
  "work experience",
  "professional experience",
  "employment",
  "employment history",
  "projects",
  "personal projects",
  "selected projects",
  "education",
  "skills",
  "technical skills",
  "technologies",
  "certifications",
  "certificates",
  "achievements",
  "organizations",
  "organisation",
  "languages",
  "publications",
  "volunteer",
  "awards",
  "references",
  "interests",
];

function isSectionHeading(line: string): boolean {
  const cleaned = line.replace(/[:#]+$/, "").trim().toLowerCase();
  if (!cleaned || cleaned.length > 48) return false;
  if (SECTION_NAMES.includes(cleaned)) return true;
  // ALL CAPS headings ("EXPERIENCE"), but not a one-word all-caps bullet.
  return line.trim().length <= 32 && /^[A-Z][A-Z\s&/]{3,}$/.test(line.trim());
}

function looksLikeListLine(line: string): boolean {
  return BULLET_GLYPHS.test(line) || NUMBERED.test(line);
}

function stripGlyph(line: string): string {
  return line.replace(BULLET_GLYPHS, "").replace(NUMBERED, "").trim();
}

function cleanText(text: string): string {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Pure text -> bullets. No IO. PDF line wrapping means one bullet routinely
 * arrives as several lines, so a line that does not open a new bullet is
 * appended to the previous one rather than becoming its own fragment
 * (spec §Acceptance 1 — the user can still fix what this gets wrong).
 */
export function segmentBullets(rawText: string): ParsedBullet[] {
  const lines = rawText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Some PDFs keep their bullet glyphs, some lose them entirely. Decide once
  // per document which kind this is, so behaviour stays predictable.
  const glyphCount = lines.filter(looksLikeListLine).length;
  const usesGlyphs = glyphCount >= 2;

  const bullets: ParsedBullet[] = [];
  let section: string | null = null;

  for (const line of lines) {
    if (isSectionHeading(line)) {
      section = line.replace(/[:#]+$/, "").trim();
      continue;
    }

    if (usesGlyphs && !looksLikeListLine(line)) {
      const previous = bullets.at(-1);
      if (previous && previous.section === section) {
        previous.text = cleanText(`${previous.text} ${line}`);
        continue;
      }
      // Not a continuation — fall through and keep the line as its own bullet.
      // Dropping it here would hide text from the review step, and the user
      // cannot fix what they cannot see.
    }

    const text = cleanText(usesGlyphs ? stripGlyph(line) : line);
    if (text.length < 2) continue;
    // A bare date range is a heading, not an achievement.
    if (text.length < 12 && DATE_RANGE.test(text)) continue;

    bullets.push({ section, text, order: bullets.length });
  }

  return bullets;
}
