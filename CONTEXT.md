# Resume Tailor

Tailors one resume to one job description: it scores every resume bullet against the job, asks the candidate for the evidence a bullet is missing, and rewrites that bullet from the candidate's own answer.

## Documents

**Resume**:
A PDF the candidate uploads for one tailoring run. In V1 a resume exists only as an input to a run.
_Avoid_: CV, master resume, resume variant

**Bullet**:
One line item of a resume, as segmented from the uploaded document; the unit that is scored, questioned, and rewritten.
_Avoid_: item, entry, point, achievement

**Job Description (JD)**:
The pasted plain text of a single job posting; what a resume is tailored to.
_Avoid_: job posting, vacancy, role spec

## Evaluation

**Tailoring Run**:
One resume paired with one JD, and the container for everything that happens between them.
_Avoid_: session, audit, analysis, review

**JD Requirements**:
The skills, tools, and domain terms extracted once from a JD's text. Extracted once per JD, never once per bullet.
_Avoid_: keywords, tags, match criteria

**Feature Extraction**:
The structured facts read out of one bullet: the skills and tools it names, the action it describes, and whether it carries a measured result.
_Avoid_: parsing, Jev output, analysis

**Match Score**:
An integer 0–100 expressing how far one bullet's Feature Extraction overlaps one JD's requirements. The same extraction and the same requirements always produce the same score. A score describes the text it was computed from, so once that text changes the score is stale until it is computed again.
_Avoid_: relevance score, relevanceScore, rating, percentage match

**Overlap Gap**:
A bullet whose extracted skills and tools do not appear in the JD Requirements; the condition that makes a bullet a candidate for being cut or replaced.
_Avoid_: irrelevant, low relevance, mismatch

**Evidence Gap**:
A bullet that carries no measured result; the condition that triggers a question to the candidate.
_Avoid_: needsMoreContext, low context, weak bullet, vague

## Authoring

**Story**:
The candidate's own unstructured answer to a question the tool asked about one bullet — the raw material for a rewrite.
_Avoid_: answer, note, context, input

**Story Fact**:
A single structured value extracted from a Story: a metric, a scale, a tool, or a timeframe.
_Avoid_: metadata, attribute, tag

**Revision**:
One generated rewrite of a bullet, produced from that bullet plus its Story Facts. One bullet may accumulate many revisions.
_Avoid_: polished bullet, final bullet, output, result

**Decision**:
The candidate's verdict on one Revision: accepted, edited, or rejected. Every revision carries exactly one, and none are implied by another.
_Avoid_: user_accepted, status, approval

## Reserved for V2

**Master Resume**: the long-lived resume a candidate maintains across applications, as opposed to whatever they upload for one run.
**Resume Variant**: a named edition of the Master Resume aimed at a role family (e.g. frontend, fullstack); a candidate sends one variant per application.
**Candidate Preferences**: the candidate's own constraints — salary floor, location, excluded industries — as opposed to an employer's requirements.
**Story Library**: Stories retained across runs so the same experience never has to be re-told for a second JD.
