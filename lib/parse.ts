export type ParsedBullet = {
  section: string | null;
  text: string;
  order: number;
};

const BULLET_GLYPHS = /^[-•*▪▫●○◦·‣⁃º>»]\s*/;
const NUMBERED = /^\(?\d{1,2}[.)]\s+/;

/**
 * A line that carries a date: a range ("08/2025 - 05/2026", "2021 - 2023",
 * "Jan 2020 – Present"), or a bare year.
 */
const DATE_START =
  /^(?:\d{1,2}[\/.\-]\d{4}|\d{4}|[A-Z][a-z]{2,8}\.?\s+\d{4})\s*[-–—]|^(?:\d{1,2}[\/.\-]\d{4}|\d{4})$/;

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
  "tools",
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

/**
 * Sections that are one list or one paragraph rather than a set of entries, so
 * they become a single Bullet: a skill list split into eleven bullets is noise,
 * and a summary split mid-sentence is not a bullet at all (ADR-0006).
 */
const WHOLE_SECTION = new Set([
  "summary",
  "profile",
  "objective",
  "skills",
  "technical skills",
  "technologies",
  "tools",
  "certifications",
  "certificates",
  "languages",
  "interests",
  "references",
]);

const CANONICAL_BY_KEY = new Map(
  SECTION_NAMES.map((name) => [
    name.replace(/\s+/g, ""),
    name
      .split(" ")
      .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
      .join(" "),
  ]),
);

/**
 * Returns the label to use for a heading line, or null when the line is not a
 * heading. PDF extraction inserts spaces inside words often enough that
 * headings arrive as "SUMM ARY", so an all-caps line is matched with its spaces
 * removed and reported under a canonical label.
 */
function headingLabel(line: string): string | null {
  const cleaned = line.replace(/[:#]+$/, "").trim();
  if (!cleaned) return null;

  const direct = CANONICAL_BY_KEY.get(cleaned.toLowerCase().replace(/\s+/g, ""));
  if (SECTION_NAMES.includes(cleaned.toLowerCase())) return direct ?? cleaned;

  const isAllCaps = cleaned.length <= 32 && /^[A-Z][A-Z\s&/]{3,}$/.test(cleaned);
  if (!isAllCaps) return null;
  return direct ?? cleaned;
}

function isGlyphLine(line: string): boolean {
  return BULLET_GLYPHS.test(line) || NUMBERED.test(line);
}

/**
 * A short, unpunctuated line directly above a date or a bullet list is the
 * title of the entry that follows — "Frontend Engineer" above "08/2025 - 05/2026".
 * Long lines and lines ending in punctuation are prose, not titles, so a
 * wrapped sentence above the next date does not start an entry of its own.
 */
function looksLikeTitle(line: string, next: string | undefined): boolean {
  if (isGlyphLine(line) || DATE_START.test(line)) return false;
  if (next === undefined || !(DATE_START.test(next) || isGlyphLine(next))) return false;
  // Wrapped text continues mid-sentence in lower case; titles start upper case.
  if (!/^[A-Z]/.test(line)) return false;
  return line.length <= 60 && line.split(/\s+/).length <= 8 && !/[.;,]$/.test(line);
}

/** A long, punctuated line: a summary paragraph, as opposed to a contact detail. */
function isProse(line: string): boolean {
  return line.length > 80 && /[.]$/.test(line);
}

function stripGlyph(line: string): string {
  return line.replace(BULLET_GLYPHS, "").replace(NUMBERED, "").trim();
}

function cleanText(text: string): string {
  return text
    .replace(/\u0000/g, " ")
    // Columns in the PDF arrive glued: "05/2026Mid Frontend Developer".
    .replace(/(\d{3,})([A-Z][a-z])/g, "$1 $2")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

type Mode = "whole" | "item";

type Entry = {
  lines: string[];
  /** Opened by a title, date or employer line rather than by a bullet glyph. */
  openedByHeader: boolean;
  /** Carries a date or a bullet list, so the next one starts a new entry. */
  anchored: boolean;
  /** Substantive lines — bullets and prose — as opposed to header lines. */
  details: number;
};

function buildEntry(line: string): Entry {
  return {
    lines: [stripGlyph(line)],
    openedByHeader: !isGlyphLine(line),
    anchored: isGlyphLine(line) || DATE_START.test(line),
    // A date line often carries its own title ("08/2025 - 05/2026 Dev"), so
    // only a bullet counts as substance at this point.
    details: isGlyphLine(line) ? 1 : 0,
  };
}

/**
 * Pure text -> bullets. The unit is an *entry*, not a line: PDF extraction
 * drops bullet glyphs and wraps prose, so line-based segmentation cuts one job
 * into six fragments and a skill list into eleven bullets. An entry absorbs its
 * title, employer, dates and responsibilities; a section that is a list or a
 * paragraph stays a single bullet; the header above the first heading — name,
 * phone, links — is left out entirely (ADR-0006).
 */
export function segmentBullets(rawText: string): ParsedBullet[] {
  const lines = rawText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // A document with no headings at all has no structure to judge, so every line
  // is kept rather than guessing which parts are the header.
  if (!lines.some((line) => headingLabel(line) !== null)) {
    return lines
      .map((line) => cleanText(stripGlyph(line)))
      .filter((text) => text.length >= 2)
      .map((text, order) => ({ section: null, text, order }));
  }

  const bullets: ParsedBullet[] = [];
  let section: string | null = null;
  let current: Entry | null = null;

  const flush = () => {
    if (!current) return;
    const text = cleanText(current.lines.join(" "));
    if (text.length >= 2) {
      bullets.push({ section, text, order: bullets.length });
    }
    current = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    const heading = headingLabel(line);
    if (heading) {
      flush();
      section = heading;
      continue;
    }

    // Everything above the first heading is the resume header — name, job
    // title, phone, portfolio links — which is not job-relevant content and is
    // left out. A long prose line up there is a summary that lost its heading.
    if (section === null) {
      if (isProse(line)) {
        bullets.push({ section: null, text: cleanText(stripGlyph(line)), order: bullets.length });
      }
      continue;
    }

    const mode: Mode = WHOLE_SECTION.has(section.toLowerCase()) ? "whole" : "item";
    // `flush` assigns `current` inside a closure, which control-flow analysis
    // cannot follow, so the read is cast back to the declared shape.
    const entry = current as Entry | null;

    if (!entry) {
      current = buildEntry(line);
      continue;
    }

    if (mode === "whole") {
      entry.lines.push(stripGlyph(line));
      continue;
    }

    const glyph = isGlyphLine(line);
    const dated = DATE_START.test(line);
    // A school or employer line sits *under* its date, so a title only opens a
    // new entry once the current entry already has substance.
    const startsTitle = looksLikeTitle(line, lines[index + 1]) && entry.anchored && entry.details > 0;
    const startsNewEntry = glyph ? !entry.openedByHeader : dated ? entry.anchored : startsTitle;

    if (startsNewEntry) {
      flush();
      current = buildEntry(line);
      continue;
    }

    entry.lines.push(stripGlyph(line));
    if (glyph || dated) entry.anchored = true;
    if (glyph || line.length > 60) entry.details += 1;
  }

  flush();
  return bullets;
}
