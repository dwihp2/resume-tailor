import { createHash } from "node:crypto";
import type { BulletFeatures, JdRequirements } from "./schemas";

/**
 * Bumped whenever weights or the normalisation rules change, so a stored score
 * can always be traced back to the function that produced it (ADR-0001).
 */
export const SCORING_VERSION = "1.0.0";

export const SCORING_WEIGHTS = {
  coverage: 60,
  evidence: 25,
  scope: 10,
  domain: 5,
} as const;

export type ScoreResult = {
  score: number;
  matched: string[];
  missing: string[];
  overlapGap: boolean;
  evidenceGap: boolean;
  scoringVersion: string;
};

/**
 * Case, punctuation and spacing must not change a score, so every term is
 * folded before comparison. `+` and `#` survive because C++ and C# are not
 * the same skill as C.
 */
export function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "")
    .trim();
}

function termSet(values: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = normalizeTerm(value);
    if (normalized) seen.add(normalized);
  }
  return [...seen].sort();
}

/**
 * Pure function: same features plus same requirements always produce the same
 * result. No IO, no clock, no model call.
 */
export function scoreBullet(features: BulletFeatures, requirements: JdRequirements): ScoreResult {
  const required = termSet([...requirements.skills, ...requirements.tools]);
  const owned = termSet([...features.skills, ...features.tools]);
  const ownedSet = new Set(owned);

  const matched = required.filter((term) => ownedSet.has(term));
  const missing = required.filter((term) => !ownedSet.has(term));

  const coverage = required.length === 0 ? 0 : matched.length / required.length;
  const action = normalizeTerm(features.action);
  const domainHit = termSet(requirements.domainTerms).some(
    (term) => ownedSet.has(term) || (term.length > 2 && action.includes(term)),
  );

  const raw =
    SCORING_WEIGHTS.coverage * coverage +
    (features.hasMetric ? SCORING_WEIGHTS.evidence : 0) +
    (features.scope?.trim() ? SCORING_WEIGHTS.scope : 0) +
    (domainHit ? SCORING_WEIGHTS.domain : 0);

  return {
    score: Math.max(0, Math.min(100, Math.round(raw))),
    matched,
    missing,
    overlapGap: matched.length === 0,
    evidenceGap: !features.hasMetric,
    scoringVersion: SCORING_VERSION,
  };
}

/**
 * Hash of everything a score depends on, with arrays sorted so key order cannot
 * change it. Stored beside each score so acceptance 7 (re-evaluating gives the
 * same numbers) is checkable against the database rather than taken on trust.
 */
export function scoreInputsHash(features: BulletFeatures, requirements: JdRequirements): string {
  const canonical = JSON.stringify({
    scoringVersion: SCORING_VERSION,
    features: { ...features, skills: [...features.skills].sort(), tools: [...features.tools].sort() },
    requirements: {
      skills: [...requirements.skills].sort(),
      tools: [...requirements.tools].sort(),
      domainTerms: [...requirements.domainTerms].sort(),
      senioritySignals: [...requirements.senioritySignals].sort(),
    },
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}
