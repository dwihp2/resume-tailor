# V1 Spec — the tailoring loop, directly usable

## Goal

One candidate tailors one uploaded resume to one pasted JD and leaves with rewritten bullets they can paste into their resume. No accounts, no resume library, no document export.

## Acceptance

1. Upload a resume PDF, paste a JD, and the tool segments the resume into bullets the user can **edit, merge, drop, or reorder before scoring**.
2. Every bullet gets a Match Score with the matched terms that justify it, listed worst-first.
3. Bullets carrying an Overlap Gap or an Evidence Gap get one question each, worded per gap type; answering stores a Story and its Story Facts.
4. A Revision is generated from the bullet plus its Story Facts, shown as a before/after diff, and can be accepted, edited, or rejected.
5. Rejecting a Revision generates a fresh one; earlier revisions remain visible.
6. Accepted and edited text can be copied out as a markdown block.
7. Re-evaluating the same resume and JD yields identical Match Scores.

Step 1 is not optional polish: PDF line wrapping routinely splits one bullet into fragments, and scoring fragments produces confident nonsense. Hand-fixing segmentation is what makes the rest of the loop trustworthy.

## Pipeline

| # | Stage | Where | Contract |
|---|---|---|---|
| 1 | Segment | `lib/parse` | PDF → text → bullets with section label and display order |
| 2 | JD Requirements | `lib/extract` | LLM + Zod, **once per JD**: skills, tools, domain terms, seniority signals |
| 3 | Feature Extraction | `lib/extract` | LLM + Zod, **per bullet**: skills, tools, action, `has_metric`, metric, scope |
| 4 | Score | `lib/score` | Pure function, no IO: weighted overlap with JD Requirements + evidence bonus, plus per-gap flags |
| 5 | Question | `lib/prompts` | Overlap Gap → "is this relevant to this JD, or should it be cut?" · Evidence Gap → "what was the measured result — latency, scale, throughput?" |
| 6 | Extract Story Facts | `lib/extract` | LLM + Zod over the Story: metric, scale, tool, timeframe |
| 7 | Revision | `lib/generate` | Bullet + Story Facts + JD Requirements → rewritten bullet, strict schema; a value that is not in the Story Facts must not appear in the revision |
| 8 | Decide | API | accepted / edited / rejected on one Revision; a new row per regeneration |

Stage 2 runs once per JD rather than once per bullet — it is both the cost fix and the reason scoring is reproducible.

## Data model (delta vs PRD §4)

| PRD | V1 | Why |
|---|---|---|
| `audit_sessions` (`status`) | `tailoring_runs` (no status) | ADR-0003 |
| `bullet_evaluations.relevance_score` | `match_score` | glossary: Match Score |
| `bullet_evaluations.jev_raw_output` | `features` | ADR-0004 |
| `bullet_evaluations.needs_context` / `targeted_question` | `overlap_gap`, `evidence_gap`, `question` | Two axes with different remedies; both derived from the extraction |
| — | `bullet_evaluations.scoring_version`, `matched_terms` | Reproducibility and "why 63?" |
| `candidate_stories.final_llm_bullet`, `.user_accepted` | `bullet_stories` (`raw_input`, `story_facts`) + `bullet_revisions` (`revision_text`, `decision`, `model`, `created_at`) | A boolean cannot express accepted/edited/rejected, and a bullet may hold many revisions |
| — | `jd_requirements` | Extracted once per JD |
| — | `bullet_evaluations.evaluation_inputs_hash` | Cheap guard: same inputs must give the same score |

`owner_id` on every table; one seeded user row (ADR-0002).

## Modules

- `lib/parse` — PDF text, bullet segmentation, normalization.
- `lib/extract` — every LLM call that returns structured facts, with Zod schemas and versioned prompt strings.
- `lib/score` — pure scoring; imports nothing that does IO.
- `lib/generate` — revision generation.
- `lib/prompts` — prompt text and versions, shared by `extract` and `generate`.
- `app/api/*` — thin handlers: upload resume, create run, evaluate, submit story, generate revision, decide.
- UI — two screens: run list, run detail (segmentation → scored list → question → diff → copy).

Stack as the PRD, minus Framer Motion (polish); React Hook Form optional since the forms are textareas.

## Cut to V2

Auth and the SaaS template · DOCX/PDF generation · voice storytelling · mock interview prep · aggregate skill-gap analysis · Master Resume and Resume Variants · Candidate Preferences · Story Library imports (e.g. seeding from an existing career narrative document) · Framer Motion · TanStack Table.

**P1, cut first if the deadline bites:** one "experience narrative" textarea per run, appended to revision context.

## Verification bar

- `lib/score`: same features twice ⇒ identical score; zero overlap ⇒ 0; metric-bearing extraction ⇒ evidence bonus. Determinism is the one behaviour worth a permanent test, because it is the property the whole design rests on.
- One real resume and one real JD hand-checked end to end.
- Manual smoke of the loop in the browser; no tests for UI wiring.
