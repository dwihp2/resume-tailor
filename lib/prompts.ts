/**
 * Every prompt the tool sends, in one place, with a version. Prompts are part
 * of the contract with the model: when one changes, the version changes so
 * stored extractions can be traced to the prompt that produced them.
 */
export const PROMPT_VERSION = "1.0.0";

const EXTRACTION_RULES = `Rules:
- Report only what the text states. Never infer and never invent a number, tool or outcome.
- Copy a term the way the text writes it.
- An empty list is a valid answer. Do not pad it.`;

export function jdRequirementsPrompt(jdText: string): string {
  return `List what this employer asks for, so a resume can be scored against it.

${EXTRACTION_RULES}

Job description:
"""
${jdText}
"""`;
}

export function bulletFeaturesPrompt(bullet: string): string {
  return `Read one resume bullet and report the facts it states.

${EXTRACTION_RULES}
- "hasMetric" is true only if the bullet states a measured result, and "metric" must then hold that value and unit.

Bullet:
"""
${bullet}
"""`;
}

export function storyFactsPrompt(question: string, answer: string): string {
  return `Read a candidate's answer about their own work and list the facts it contains.

${EXTRACTION_RULES}

Question asked: ${question}

Candidate's answer:
"""
${answer}
"""`;
}

export function revisionPrompt(input: {
  bullet: string;
  jobTitleHint: string;
  storyFacts: string[];
  question: string;
}): string {
  return `Rewrite one resume bullet so it states the candidate's real result in their own facts.

Rules:
- Use only facts from the bullet or the candidate's answer. A number that appears in neither must not appear in the rewrite.
- One line, no bullet glyph, no markdown, past tense, start with a verb.
- Keep it under 240 characters.
- Do not name a technology the candidate did not mention.

Original bullet:
"""
${input.bullet}
"""

Question the candidate answered: ${input.question}

Facts the candidate stated:
"""
${input.storyFacts.join("\n") || "(none stated)"}
"""

Target role: ${input.jobTitleHint}`;
}

/** The model's way of saying the notes do not cover this bullet. */
export const NOT_IN_NOTES = "NOT IN NOTES";

export function answerDraftPrompt(input: { bullet: string; question: string; notes: string }): string {
  return `Draft an answer the candidate could give about one resume bullet, using only what they already wrote down.

Rules:
- Use only facts stated in the notes. Never add a number, tool or outcome of your own.
- If the notes cover several employers or projects, use only the part that concerns this bullet. Never move a result from one employer to another.
- Write in the first person, as the candidate, in plain prose, two sentences at most.
- If the notes say nothing that answers the question about this bullet, reply with exactly: ${NOT_IN_NOTES}

The bullet in question:
"""
${input.bullet}
"""

The question the candidate was asked: ${input.question}

The candidate's notes:
"""
${input.notes}
"""`;
}

/**
 * The question asked about one bullet. Which gap a bullet carries decides the
 * question, because a bullet that is off-topic needs a different answer than a
 * bullet that is on-topic but unquantified (spec §Pipeline stage 5).
 */
export function gapQuestion(gaps: { overlapGap: boolean; evidenceGap: boolean }, bullet: string): string {
  const excerpt = bullet.length > 80 ? `${bullet.slice(0, 77)}…` : bullet;
  if (gaps.overlapGap && gaps.evidenceGap) {
    return `"${excerpt}" shares nothing with this job and states no result. What did it achieve, in numbers — and does it belong in this resume at all?`;
  }
  if (gaps.overlapGap) {
    return `"${excerpt}" names none of this job's skills or tools. Is it still relevant here, or should it be cut? If it stays, what was the outcome?`;
  }
  return `"${excerpt}" reads as work without a result. What was the measured outcome — time saved, scale, throughput or error rate?`;
}
