import { Decision } from "./generated/prisma/enums";
import { prisma } from "./db";
import { DomainError } from "./errors";
import { generateRevision } from "./generate";
import { getModel } from "./model";
import { extractPdfText } from "./pdf";
import { segmentBullets } from "./parse";
import { ensureOwner } from "./owner";
import { PROMPT_VERSION, gapQuestion } from "./prompts";
import { scoreBullet, scoreInputsHash } from "./score";
import { decisionSchema, jdRequirementsSchema } from "./schemas";
import { z } from "zod";

/** How many bullets are in flight at once when scoring a run. */
const EVALUATION_CONCURRENCY = 4;

export type RunBulletView = {
  id: string;
  evaluationId: string | null;
  section: string | null;
  text: string;
  displayOrder: number;
  score: number | null;
  stale: boolean;
  matched: string[];
  missing: string[];
  overlapGap: boolean;
  evidenceGap: boolean;
  question: string | null;
  stories: { id: string; rawInput: string; facts: string[] }[];
  revisions: {
    id: string;
    text: string;
    decision: Decision;
    decidedText: string | null;
    modelName: string;
  }[];
};

export type RunView = {
  id: string;
  createdAt: string;
  resume: { id: string; title: string };
  job: {
    companyName: string | null;
    roleTitle: string | null;
    rawText: string;
    requirements: {
      skills: string[];
      tools: string[];
      domainTerms: string[];
      senioritySignals: string[];
    } | null;
  };
  bullets: RunBulletView[];
  progress: { bullets: number; scored: number; answered: number; revised: number; decided: number };
};

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function asFactValues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((fact) =>
    fact && typeof fact === "object" && "value" in fact
      ? String((fact as { value: unknown }).value)
      : String(fact),
  );
}

export async function listRuns() {
  const owner = await ensureOwner();
  return prisma.tailoringRun.findMany({
    where: { ownerId: owner.id },
    orderBy: { createdAt: "desc" },
    include: {
      resume: true,
      jobDescription: { include: { requirements: true } },
      evaluations: { include: { revisions: true } },
    },
  });
}

/**
 * ADR-0003: nothing here reads or writes a status column. Progress is counted
 * from the rows that actually exist.
 */
export async function getRunView(runId: string): Promise<RunView | null> {
  const run = await prisma.tailoringRun.findUnique({
    where: { id: runId },
    include: {
      resume: { include: { bullets: { orderBy: { displayOrder: "asc" } } } },
      jobDescription: { include: { requirements: true } },
      evaluations: {
        include: {
          stories: { orderBy: { createdAt: "asc" } },
          revisions: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!run) return null;

  const evaluationByBullet = new Map(run.evaluations.map((evaluation) => [evaluation.bulletId, evaluation]));

  const bullets: RunBulletView[] = run.resume.bullets.map((bullet) => {
    const evaluation = evaluationByBullet.get(bullet.id);
    return {
      id: bullet.id,
      evaluationId: evaluation?.id ?? null,
      section: bullet.section,
      text: bullet.text,
      displayOrder: bullet.displayOrder,
      score: evaluation?.matchScore ?? null,
      stale:
        evaluation?.evaluatedText != null ? evaluation.evaluatedText !== bullet.text : false,
      matched: asStrings(evaluation?.matchedTerms),
      missing: asStrings(evaluation?.missingTerms),
      overlapGap: evaluation?.overlapGap ?? false,
      evidenceGap: evaluation?.evidenceGap ?? false,
      question: evaluation?.question ?? null,
      stories: (evaluation?.stories ?? []).map((story) => ({
        id: story.id,
        rawInput: story.rawInput,
        facts: asFactValues(story.storyFacts),
      })),
      revisions: (evaluation?.revisions ?? []).map((revision) => ({
        id: revision.id,
        text: revision.revisionText,
        decision: revision.decision,
        decidedText: revision.decidedText,
        modelName: revision.modelName,
      })),
    };
  });

  const requirements = run.jobDescription.requirements;

  return {
    id: run.id,
    createdAt: run.createdAt.toISOString(),
    resume: { id: run.resume.id, title: run.resume.title },
    job: {
      companyName: run.jobDescription.companyName,
      roleTitle: run.jobDescription.roleTitle,
      rawText: run.jobDescription.rawText,
      requirements: requirements
        ? {
            skills: asStrings(requirements.skills),
            tools: asStrings(requirements.tools),
            domainTerms: asStrings(requirements.domainTerms),
            senioritySignals: asStrings(requirements.senioritySignals),
          }
        : null,
    },
    bullets,
    progress: {
      bullets: bullets.length,
      scored: bullets.filter((bullet) => bullet.score !== null).length,
      answered: bullets.filter((bullet) => bullet.stories.length > 0).length,
      revised: bullets.filter((bullet) => bullet.revisions.length > 0).length,
      decided: bullets.filter((bullet) => bullet.revisions.some((r) => r.decision !== "pending")).length,
    },
  };
}

export type CreateRunInput = {
  file: ArrayBuffer;
  fileName: string;
  jdText: string;
  companyName?: string | null;
  roleTitle?: string | null;
};

export async function createRun(input: CreateRunInput): Promise<{ id: string }> {
  const owner = await ensureOwner();
  const rawText = await extractPdfText(input.file);
  const bullets = segmentBullets(rawText);
  if (bullets.length === 0) {
    throw new DomainError("No bullet points were found in that PDF. Check that the text layer is present.");
  }

  // Both model-backed steps run before anything is written, so a missing key or
  // a refused JD leaves no half-built run behind.
  const requirements = await getModel().jdRequirements(input.jdText);

  return prisma.$transaction(async (tx) => {
    const resume = await tx.resume.create({
      data: { ownerId: owner.id, title: input.fileName, rawText },
    });
    await tx.resumeBullet.createMany({
      data: bullets.map((bullet) => ({
        resumeId: resume.id,
        section: bullet.section,
        text: bullet.text,
        displayOrder: bullet.order,
      })),
    });
    const jobDescription = await tx.jobDescription.create({
      data: {
        ownerId: owner.id,
        companyName: input.companyName?.trim() || null,
        roleTitle: input.roleTitle?.trim() || null,
        rawText: input.jdText,
      },
    });
    await tx.jdRequirements.create({
      data: {
        jobDescriptionId: jobDescription.id,
        skills: requirements.skills,
        tools: requirements.tools,
        domainTerms: requirements.domainTerms,
        senioritySignals: requirements.senioritySignals,
        promptVersion: PROMPT_VERSION,
      },
    });
    const run = await tx.tailoringRun.create({
      data: { ownerId: owner.id, resumeId: resume.id, jobDescriptionId: jobDescription.id },
    });
    return { id: run.id };
  });
}

export async function evaluateRun(runId: string): Promise<{ scored: number }> {
  const model = getModel();
  const run = await prisma.tailoringRun.findUniqueOrThrow({
    where: { id: runId },
    include: {
      resume: { include: { bullets: { orderBy: { displayOrder: "asc" } } } },
      jobDescription: { include: { requirements: true } },
    },
  });
  const stored = run.jobDescription.requirements;
  if (!stored) throw new DomainError("That run has no extracted job requirements to score against.");
  const requirements = jdRequirementsSchema.parse({
    skills: asStrings(stored.skills),
    tools: asStrings(stored.tools),
    domainTerms: asStrings(stored.domainTerms),
    senioritySignals: asStrings(stored.senioritySignals),
  });

  const bullets = run.resume.bullets;
  for (let index = 0; index < bullets.length; index += EVALUATION_CONCURRENCY) {
    await Promise.all(
      bullets.slice(index, index + EVALUATION_CONCURRENCY).map(async (bullet) => {
        const features = await model.bulletFeatures(bullet.text);
        const result = scoreBullet(features, requirements);
        const data = {
          features,
          evaluatedText: bullet.text,
          matchScore: result.score,
          matchedTerms: result.matched,
          missingTerms: result.missing,
          overlapGap: result.overlapGap,
          evidenceGap: result.evidenceGap,
          question: result.overlapGap || result.evidenceGap ? gapQuestion(result, bullet.text) : null,
          scoringVersion: result.scoringVersion,
          inputsHash: scoreInputsHash(features, requirements),
        };
        await prisma.bulletEvaluation.upsert({
          where: { runId_bulletId: { runId, bulletId: bullet.id } },
          create: { runId, bulletId: bullet.id, ...data },
          update: data,
        });
      }),
    );
  }

  return { scored: bullets.length };
}

export async function submitStory(evaluationId: string, rawInput: string) {
  const model = getModel();
  const evaluation = await prisma.bulletEvaluation.findUniqueOrThrow({ where: { id: evaluationId } });
  const facts = await model.storyFacts(evaluation.question ?? "", rawInput);
  return prisma.bulletStory.create({
    data: { evaluationId, rawInput, storyFacts: facts.facts },
  });
}

export async function createRevision(evaluationId: string) {
  const evaluation = await prisma.bulletEvaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: {
      bullet: true,
      stories: { orderBy: { createdAt: "asc" } },
      run: { include: { jobDescription: true } },
    },
  });
  if (evaluation.stories.length === 0) {
    throw new DomainError("Answer the question about this bullet before asking for a rewrite.");
  }

  // Every answer the candidate gave counts, so a second answer adds facts
  // rather than replacing the first.
  const storyFacts = evaluation.stories.flatMap((story) => asFactValues(story.storyFacts));

  const generated = await generateRevision({
    bullet: evaluation.bullet.text,
    jobTitleHint: evaluation.run.jobDescription.roleTitle ?? "the target role",
    question: evaluation.question ?? "",
    storyFacts,
  });

  return prisma.bulletRevision.create({
    data: {
      evaluationId,
      revisionText: generated.result.bullet,
      claimsUsed: generated.result.claimsUsed,
      modelName: generated.modelName,
    },
  });
}

const decideInput = z.object({
  decision: decisionSchema,
  decidedText: z.string().trim().min(1).optional(),
});

export async function decideRevision(revisionId: string, input: unknown) {
  const { decision, decidedText } = decideInput.parse(input);
  if (decision === "edited" && !decidedText) {
    throw new DomainError("An edited revision needs the text you actually kept.");
  }
  const revision = await prisma.bulletRevision.findUniqueOrThrow({ where: { id: revisionId } });
  return prisma.bulletRevision.update({
    where: { id: revisionId },
    data: {
      decision,
      decidedText:
        decision === "accepted" ? revision.revisionText : decision === "rejected" ? null : decidedText,
      decidedAt: new Date(),
    },
  });
}

export async function updateBulletText(bulletId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new DomainError("A bullet cannot be empty.");
  return prisma.resumeBullet.update({ where: { id: bulletId }, data: { text: trimmed } });
}

export async function addBullet(resumeId: string, text: string, section: string | null) {
  const trimmed = text.trim();
  if (!trimmed) throw new DomainError("A bullet cannot be empty.");
  const last = await prisma.resumeBullet.findFirst({
    where: { resumeId },
    orderBy: { displayOrder: "desc" },
  });
  return prisma.resumeBullet.create({
    data: { resumeId, section, text: trimmed, displayOrder: (last?.displayOrder ?? -1) + 1 },
  });
}

export async function deleteBullet(bulletId: string) {
  const bullet = await prisma.resumeBullet.findUniqueOrThrow({ where: { id: bulletId } });
  await prisma.$transaction([
    prisma.resumeBullet.delete({ where: { id: bulletId } }),
    prisma.resumeBullet.updateMany({
      where: { resumeId: bullet.resumeId, displayOrder: { gt: bullet.displayOrder } },
      data: { displayOrder: { decrement: 1 } },
    }),
  ]);
}

export async function mergeBulletWithPrevious(bulletId: string) {
  const bullet = await prisma.resumeBullet.findUniqueOrThrow({ where: { id: bulletId } });
  const previous = await prisma.resumeBullet.findFirst({
    where: { resumeId: bullet.resumeId, displayOrder: { lt: bullet.displayOrder } },
    orderBy: { displayOrder: "desc" },
  });
  if (!previous) throw new DomainError("This bullet is already the first one.");

  await prisma.$transaction([
    prisma.resumeBullet.update({
      where: { id: previous.id },
      data: { text: `${previous.text} ${bullet.text}`.replace(/\s+/g, " ").trim() },
    }),
    prisma.resumeBullet.delete({ where: { id: bullet.id } }),
    prisma.resumeBullet.updateMany({
      where: { resumeId: bullet.resumeId, displayOrder: { gt: bullet.displayOrder } },
      data: { displayOrder: { decrement: 1 } },
    }),
  ]);
  return { mergedInto: previous.id };
}

export async function moveBullet(bulletId: string, delta: number) {
  const bullet = await prisma.resumeBullet.findUniqueOrThrow({ where: { id: bulletId } });
  const neighbour = await prisma.resumeBullet.findFirst({
    where: {
      resumeId: bullet.resumeId,
      displayOrder: delta < 0 ? { lt: bullet.displayOrder } : { gt: bullet.displayOrder },
    },
    orderBy: { displayOrder: delta < 0 ? "desc" : "asc" },
  });
  if (!neighbour) return { moved: false };

  await prisma.$transaction([
    prisma.resumeBullet.update({
      where: { id: bullet.id },
      data: { displayOrder: neighbour.displayOrder },
    }),
    prisma.resumeBullet.update({
      where: { id: neighbour.id },
      data: { displayOrder: bullet.displayOrder },
    }),
  ]);
  return { moved: true };
}
