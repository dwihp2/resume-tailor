# V1 Spec — the tailoring loop, directly usable

## Goal

One candidate tailors one uploaded resume to one pasted JD and leaves with rewritten bullets they can paste into their resume. No accounts, no resume library, no document export.

## Acceptance

1. Upload a resume PDF, paste a JD, and the tool segments the resume into bullets the user can **edit, merge, drop, reorder, or add to before scoring**.
2. Every bullet gets a Match Score with the matched terms that justify it, listed worst-first, and groupable into All / Worth fixing (names the job's stack but states no result) / Off target / Already quantified.
3. Bullets carrying an Overlap Gap or an Evidence Gap get one question each, worded per gap type; answering stores a Story and its Story Facts.
4. A Revision is generated from the bullet plus its Story Facts, shown as a before/after diff, and can be accepted, edited, or rejected.
5. Rejecting a Revision never dead-ends: the rejected revision stays visible, the answer box stays open, and the next rewrite is one click away as an *additional* revision. The generator is deliberately not re-run on rejection — the same inputs mostly reproduce the text the user just rejected, and a silent extra model call is worse than an explicit click.
6. Accepted and edited text can be copied out — per bullet, and as one markdown block of every kept bullet.
7. Re-scoring the same resume and JD reproduces the same Match Scores whenever Feature Extraction is identical, which the e2e run asserts against the offline model. With a live model, extraction can differ between runs; `scoring_version` and `inputs_hash` are stored per evaluation so a changed score is attributable to a changed extraction instead of being unexplainable.
8. Editing a bullet that has already been scored marks its Match Score **stale**, and scoring again clears the mark: a score never silently outlives the text it was computed from.

Step 1 is not optional polish: PDF line wrapping routinely splits one bullet into fragments, and scoring fragments produces confident nonsense. Hand-fixing segmentation is what makes the rest of the loop trustworthy.

## Pipeline

| # | Stage | Where | Contract |
|---|---|---|---|
| 1 | Extract + segment | `lib/pdf` → `lib/parse` | PDF → text → bullets with section label and display order. Pure except for the PDF read |
| 2 | JD Requirements | `lib/model` | LLM + Zod, **once per JD**: skills, tools, domain terms, seniority signals |
| 3 | Feature Extraction | `lib/model` | LLM + Zod, **per bullet**: skills, tools, action, `hasMetric`, metric, scope |
| 4 | Score | `lib/score` | Pure function, no IO: weighted overlap with JD Requirements + evidence bonus, plus per-gap flags |
| 5 | Question | `lib/prompts` | Overlap Gap → "is this relevant to this JD, or should it be cut?" · Evidence Gap → "what was the measured result — latency, scale, throughput?" |
| 6 | Story Facts | `lib/model` | LLM + Zod over the Story: metric, scale, tool, timeframe |
| 7 | Revision | `lib/generate` | Bullet + Story Facts + JD Requirements → rewritten bullet, strict schema, then a guard: a number that appears in neither the bullet nor the Story Facts is rejected and retried once |
| 8 | Decide | `app/api` | accepted / edited / rejected on one Revision; a new row per regeneration |

Stage 2 runs once per JD rather than once per bullet — it is both the cost fix and the reason scoring is reproducible.

## Data model (delta vs PRD §4)

| PRD | V1 | Why |
|---|---|---|
| `audit_sessions` (`status`) | `tailoring_runs` (no status) | ADR-0003 |
| `bullet_evaluations.relevance_score` | `match_score` | glossary: Match Score |
| `bullet_evaluations.jev_raw_output` | `features` | ADR-0004 |
| `bullet_evaluations.needs_context` / `targeted_question` | `overlap_gap`, `evidence_gap`, `question` | Two axes with different remedies; both derived from the extraction |
| — | `bullet_evaluations.scoring_version`, `matched_terms`, `missing_terms` | Reproducibility and "why 63?" |
| `candidate_stories.final_llm_bullet`, `.user_accepted` | `bullet_stories` (`raw_input`, `story_facts`) + `bullet_revisions` (`revision_text`, `claims_used`, `decision`, `decided_text`, `model_name`) | A boolean cannot express accepted/edited/rejected, and a bullet may hold many revisions |
| — | `decision` includes `pending` | A fresh revision has no verdict yet; `pending` keeps the column non-null and "what is outstanding" one predicate |
| — | `jd_requirements` | Extracted once per JD |
| — | `bullet_evaluations.inputs_hash` | Same inputs must give the same score, provably |

`owner_id` on every table (ADR-0002). There is no seed step: the single owner row is created on demand by `ensureOwner()`, so a fresh database cannot be missing it.

## Modules

- `lib/pdf` — the only place that knows about PDF internals.
- `lib/parse` — pure text → bullets: segmentation, wrap re-joining, section tracking.
- `lib/score` — pure scoring and the inputs hash; imports nothing that does IO.
- `lib/model` — the entire LLM surface (four extractions, one generation), the offline stand-in, and the provider guard. There is no separate `lib/extract`: the adapter *is* the extraction boundary.
- `lib/generate` — revision generation plus the invented-number guard and its single retry.
- `lib/prompts` — prompt text and versions, and the per-gap question wording.
- `lib/diff` — pure word-level diff for the before/after view.
- `lib/run` — the tailoring-run lifecycle: create, evaluate, answer, rewrite, decide, and the bullet edits.
- `lib/db`, `lib/owner`, `lib/errors`, `lib/api`, `lib/client` — client singleton, single-owner bootstrap, domain error, response shaping, browser fetch helpers.
- `app/api/*` — thin handlers; `components/*` — upload form, segmentation editor, bullet workbench.
- UI — two screens: run list, run detail (segmentation → scored list → question → diff → copy).

Stack as the PRD, minus Framer Motion (polish), TanStack Table (a plain sorted list is enough) and React Hook Form (the forms are textareas).

## Cut to V2

Auth and the SaaS template · DOCX/PDF generation · voice storytelling · mock interview prep · aggregate skill-gap analysis · Master Resume and Resume Variants · Candidate Preferences · Story Library imports (e.g. seeding from an existing career narrative document) · Framer Motion · TanStack Table.

**P1, cut first if the deadline bites:** one "experience narrative" textarea per run, appended to revision context.

## Known V1 limitations

- PDF extraction inserts spaces inside words often enough that headings arrive broken ("SUMM ARY"); those are repaired by canonicalising known section names, but an unknown heading keeps whatever the extractor produced.
- A stale score is flagged on the card, but the question previously derived from it is only replaced when the bullet is scored again.

## Verification bar

- Unit tests (`npx vitest run`): scoring determinism and weights, segmentation including wrap re-joining, the word diff, the invented-number guard, and the provider guard. Determinism is the behaviour worth a permanent test, because the whole design rests on it.
- Browser tests (`npx playwright test`): segmentation and scoring of an uploaded PDF, the full question → answer → rewrite → accept/edit/reject → copy loop, and a re-score that must reproduce identical scores. They run against `LLM_PROVIDER=fake`, so they need no API key and no network, and the app names that mode in the UI.
- The fixture PDF is generated by `tests/fixtures/resume-pdf.mjs`, so no real resume is committed to the repository.
