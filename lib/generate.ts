import { DomainError } from "./errors";
import { getModel, type RevisionInput } from "./model";
import type { RevisionResult } from "./schemas";

const NUMBER = /\d+(?:[.,]\d+)?/g;

/**
 * Numbers in a rewrite that the candidate never stated. The whole product
 * promise is "we only tell the truth about you", so an invented metric is the
 * one failure that must never reach the screen.
 */
export function inventedNumbers(candidate: string, allowed: readonly string[]): string[] {
  const allowedText = allowed.join("\n").toLowerCase();
  const found = candidate.match(NUMBER) ?? [];
  return [...new Set(found)].filter((value) => !allowedText.includes(value.toLowerCase()));
}

export type GeneratedRevision = {
  result: RevisionResult;
  modelName: string;
  repaired: boolean;
};

export async function generateRevision(input: RevisionInput): Promise<GeneratedRevision> {
  const model = getModel();
  const allowed = [input.bullet, ...input.storyFacts];

  let result = await model.revision(input);
  let invented = inventedNumbers(result.bullet, allowed);
  if (invented.length === 0) {
    return { result, modelName: model.name, repaired: false };
  }

  // One repair attempt with the offending values named, then give up loudly.
  result = await model.revision({
    ...input,
    question: `${input.question}\n\nYour previous draft invented these values, which the candidate never stated: ${invented.join(", ")}. Rewrite it without them.`,
  });
  invented = inventedNumbers(result.bullet, allowed);
  if (invented.length > 0) {
    throw new DomainError(
      `The model kept inventing a number the candidate never stated (${invented.join(", ")}). Rewrite it yourself, or add the real figure to your answer.`,
    );
  }
  return { result, modelName: model.name, repaired: true };
}
