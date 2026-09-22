# A Bullet is an entry, not a line

Segmentation groups a resume into **entries**: a job arrives as one bullet carrying its dates, employer and responsibilities; a school arrives as one; a Skills or Languages section arrives as one. Previously every extracted line became its own bullet, with non-glyph lines merged only when the document used bullet glyphs.

The line-based rule failed on the document it had to serve. A real resume's PDF loses its bullet glyphs, so the fallback put every line in its own bullet: one job became six, responsibilities were cut mid-clause ("…for rapid prototyping, significantly" / "increasing feature delivery speed."), the summary was split from its own second sentence, and an eleven-row skill list became eleven bullets — several of which then scored highly simply by naming a technology, and polluted the triage group that is supposed to point at work worth fixing.

Two alternatives were rejected. Reading the PDF's layout coordinates would be more faithful, but it welds the segmentation to one extractor's geometry and cannot be tested without a PDF. Guessing sentence boundaries would still produce multiple bullets per job, which the candidate explicitly did not want — the resume's own structure is the entry.

**Consequences:** entry detection now depends on date patterns (a date at the start of a line, or a title directly above one) and on the section list that is treated as a single bullet (`WHOLE_SECTION` in `lib/parse.ts`). A document with neither dates nor glyphs collapses each section into one bullet, which the review step can split by hand — the same escape hatch that already covered every other extraction failure.
