import { z } from "zod";

/**
 * Structured facts read out of one resume bullet (spec §Pipeline stage 3).
 * Produced by the LLM, consumed by lib/score — which never calls a model.
 */
export const bulletFeaturesSchema = z.object({
  skills: z.array(z.string()).describe("Technologies, languages, frameworks and practices the bullet names"),
  tools: z.array(z.string()).describe("Named products, platforms and services the bullet names"),
  action: z.string().describe("The verb phrase describing what the candidate did"),
  hasMetric: z.boolean().describe("True only when the bullet states a measured result"),
  metric: z
    .object({ value: z.number(), unit: z.string() })
    .nullable()
    .describe("The measured result, when hasMetric is true"),
  scope: z.string().nullable().describe("Scale or setting, e.g. team size, user count, duration"),
});

export type BulletFeatures = z.infer<typeof bulletFeaturesSchema>;

/**
 * Facts extracted once per job description (spec §Pipeline stage 2).
 */
export const jdRequirementsSchema = z.object({
  skills: z.array(z.string()),
  tools: z.array(z.string()),
  domainTerms: z.array(z.string()),
  senioritySignals: z.array(z.string()),
});

export type JdRequirements = z.infer<typeof jdRequirementsSchema>;

/**
 * Structured values read out of the candidate's Story (spec §Pipeline stage 6).
 */
export const storyFactsSchema = z.object({
  facts: z.array(
    z.object({
      kind: z.enum(["metric", "scale", "tool", "timeframe"]),
      value: z.string(),
    }),
  ),
});

export type StoryFacts = z.infer<typeof storyFactsSchema>;

/**
 * One generated rewrite of a bullet (spec §Pipeline stage 7).
 */
export const revisionSchema = z.object({
  bullet: z.string().describe("The rewritten bullet, one line, no markdown"),
  claimsUsed: z
    .array(z.string())
    .describe("The Story Facts this rewrite relies on, quoted as the candidate stated them"),
});

export type RevisionResult = z.infer<typeof revisionSchema>;

export const decisionSchema = z.enum(["accepted", "edited", "rejected"]);
export type Decision = z.infer<typeof decisionSchema>;
