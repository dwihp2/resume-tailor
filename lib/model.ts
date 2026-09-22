import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import {
  answerDraftPrompt,
  bulletFeaturesPrompt,
  jdRequirementsPrompt,
  NOT_IN_NOTES,
  revisionPrompt,
  storyFactsPrompt,
} from "./prompts";
import {
  answerDraftSchema,
  bulletFeaturesSchema,
  jdRequirementsSchema,
  revisionSchema,
  storyFactsSchema,
  type AnswerDraft,
  type BulletFeatures,
  type JdRequirements,
  type RevisionResult,
  type StoryFacts,
} from "./schemas";

export type RevisionInput = {
  bullet: string;
  jobTitleHint: string;
  question: string;
  storyFacts: string[];
};

export type AnswerDraftInput = {
  bullet: string;
  question: string;
  notes: string;
};

/**
 * The whole LLM surface of this application: five extractions and one
 * generation. Nothing else calls a model, and lib/score calls none at all.
 */
export type ModelAdapter = {
  readonly name: string;
  jdRequirements(jdText: string): Promise<JdRequirements>;
  bulletFeatures(bullet: string): Promise<BulletFeatures>;
  storyFacts(question: string, answer: string): Promise<StoryFacts>;
  answerDraft(input: AnswerDraftInput): Promise<AnswerDraft>;
  revision(input: RevisionInput): Promise<RevisionResult>;
};

const MODEL_ID = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";

function deepseekModel() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY is not set. Set it, or run with LLM_PROVIDER=fake to work without a model.",
    );
  }
  return createDeepSeek({ apiKey })(MODEL_ID);
}

const deepseekAdapter: ModelAdapter = {
  name: `deepseek:${MODEL_ID}`,

  async jdRequirements(jdText) {
    const { object } = await generateObject({
      model: deepseekModel(),
      schema: jdRequirementsSchema,
      system: "You extract what an employer asks for. You never invent requirements.",
      prompt: jdRequirementsPrompt(jdText),
      temperature: 0,
    });
    return object;
  },

  async bulletFeatures(bullet) {
    const { object } = await generateObject({
      model: deepseekModel(),
      schema: bulletFeaturesSchema,
      system: "You extract facts from resume bullets. You never invent numbers.",
      prompt: bulletFeaturesPrompt(bullet),
      temperature: 0,
    });
    return object;
  },

  async storyFacts(question, answer) {
    const { object } = await generateObject({
      model: deepseekModel(),
      schema: storyFactsSchema,
      system: "You extract facts from a candidate's own account of their work.",
      prompt: storyFactsPrompt(question, answer),
      temperature: 0,
    });
    return object;
  },

  async revision(input) {
    const { object } = await generateObject({
      model: deepseekModel(),
      schema: revisionSchema,
      system: "You rewrite resume bullets using only the facts the candidate supplied.",
      prompt: revisionPrompt(input),
      temperature: 0.2,
    });
    return object;
  },

  async answerDraft(input) {
    const { object } = await generateObject({
      model: deepseekModel(),
      schema: answerDraftSchema,
      system: "You summarise a candidate's own notes. You never invent facts and you refuse when the notes are silent.",
      prompt: answerDraftPrompt(input),
      temperature: 0,
    });
    return object;
  },
};

/* -------------------------------------------------------------------------- */
/* Offline stand-in. Deterministic, lexicon-driven, and never used when a real */
/* API key is configured: LLM_PROVIDER=fake exists so the loop can be tested   */
/* end to end without a network call.                                          */
/* -------------------------------------------------------------------------- */

const SKILLS = [
  "typescript", "javascript", "react", "next.js", "vue", "nuxt", "angular", "svelte", "node.js",
  "express", "nestjs", "go", "golang", "python", "django", "flask", "java", "spring", "php",
  "laravel", "rust", "c++", "c#", ".net", "postgresql", "mysql", "mongodb", "sqlite", "redis",
  "prisma", "drizzle", "tailwind", "html", "css", "graphql", "rest", "trpc", "vitest", "jest",
  "playwright", "cypress", "docker", "kubernetes", "terraform", "aws", "gcp", "azure", "figma",
];

const TOOLS = [
  "sendbird", "google maps", "strapi", "headless cms", "openai", "deepseek", "gemini", "jira",
  "slack", "vercel", "supabase", "firebase", "looker studio", "grafana", "sentry", "stripe",
  "whatsapp", "excel", "notion",
];

const SENIORITY = ["senior", "lead", "staff", "principal", "head of", "manager", "junior", "mid-level"];

const METRIC = /(\d+(?:[.,]\d+)?)\s*(%|percent|seconds?|secs?\b|milliseconds?|ms\b|minutes?|mins?\b|hours?|hrs?\b|days?|weeks?|months?|users?|students?|customers?|drivers?|requests?|records?|rows?|times?)/i;
const SCOPE = /(team of \d+|\d+\s*(?:users|students|customers|drivers|components|pages|services|screens|months|years|clients)|across \d+ [a-z]+)/i;

function occurrences(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(text);
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "our", "will", "have",
  "has", "are", "was", "were", "their", "them", "they", "about", "into", "over", "more", "than",
  "must", "should", "would", "could", "work", "working", "team", "teams", "role", "job", "years",
  "experience", "strong", "good", "well", "able", "across", "using", "build", "building",
]);

function fakeFeatures(bullet: string): BulletFeatures {
  const metricMatch = bullet.match(METRIC);
  const scopeMatch = bullet.match(SCOPE);
  const clause = bullet.split(/[,;]/)[0].trim();
  return {
    skills: SKILLS.filter((skill) => occurrences(bullet, skill)),
    tools: TOOLS.filter((tool) => occurrences(bullet, tool)),
    action: clause.split(/\s+/).slice(0, 12).join(" "),
    hasMetric: Boolean(metricMatch),
    metric: metricMatch
      ? { value: Number(metricMatch[1].replace(",", ".")), unit: metricMatch[2].toLowerCase() }
      : null,
    scope: scopeMatch ? scopeMatch[1] : null,
  };
}

const fakeAdapter: ModelAdapter = {
  name: "fake:lexicon",

  async jdRequirements(jdText) {
    const seen: string[] = [];
    for (const word of words(jdText)) {
      if (word.length < 5 || STOPWORDS.has(word) || seen.includes(word)) continue;
      seen.push(word);
    }
    return {
      skills: SKILLS.filter((skill) => occurrences(jdText, skill)),
      tools: TOOLS.filter((tool) => occurrences(jdText, tool)),
      domainTerms: seen.slice(0, 6),
      senioritySignals: SENIORITY.filter((signal) => occurrences(jdText, signal)),
    };
  },

  async bulletFeatures(bullet) {
    return fakeFeatures(bullet);
  },

  async storyFacts(_question, answer) {
    const facts: StoryFacts["facts"] = [];
    const metric = answer.match(METRIC);
    if (metric) facts.push({ kind: "metric", value: `${metric[1]} ${metric[2]}` });
    const scope = answer.match(SCOPE);
    if (scope) facts.push({ kind: "scale", value: scope[1] });
    for (const tool of TOOLS.filter((tool) => occurrences(answer, tool))) {
      facts.push({ kind: "tool", value: tool });
    }
    const timeframe = answer.match(/\b(\d+\s*(?:months?|years?|weeks?))\b/i);
    if (timeframe) facts.push({ kind: "timeframe", value: timeframe[1] });
    return { facts };
  },

  async revision(input) {
    const base = input.bullet.replace(/\.\s*$/, "");
    const facts = input.storyFacts.join("; ");
    return {
      bullet: facts ? `${base}, with ${facts}` : base,
      claimsUsed: input.storyFacts,
    };
  },

  async answerDraft(input) {
    const wanted = new Set(
      [...words(input.bullet), ...words(input.question)].filter(
        (word) => word.length > 4 && !STOPWORDS.has(word),
      ),
    );
    const sentences = input.notes
      .split(/[.!?]+|\n+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const scored = sentences
      .map((sentence) => ({ sentence, hits: words(sentence).filter((word) => wanted.has(word)).length }))
      .filter((entry) => entry.hits > 0)
      .sort((a, b) => b.hits - a.hits);

    if (scored.length === 0) return { answer: NOT_IN_NOTES, basedOn: [] };
    const used = scored.slice(0, 2);
    return {
      answer: `${used.map((entry) => entry.sentence).join(". ")}.`,
      basedOn: used.map((entry) => entry.sentence),
    };
  },
};

/**
 * Chosen per call, not at import time, so a missing key fails loudly on the
 * request that needs a model instead of breaking the whole server.
 */
export function getModel(): ModelAdapter {
  const mode = (process.env.LLM_PROVIDER ?? "").trim().toLowerCase();
  if (mode === "fake") return fakeAdapter;
  if (mode !== "" && mode !== "deepseek") {
    throw new Error(`Unknown LLM_PROVIDER "${mode}" — expected "deepseek" or "fake".`);
  }
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    throw new Error(
      "DEEPSEEK_API_KEY is not set. Set it, or run with LLM_PROVIDER=fake to work without a model.",
    );
  }
  return deepseekAdapter;
}

/**
 * What the UI shows so nobody has to guess whether rewrites came from a real
 * model. Never throws: a missing key is a state to display, not a crash.
 */
export function modelLabel(): string {
  const mode = (process.env.LLM_PROVIDER ?? "").trim().toLowerCase();
  if (mode === "fake") return "offline stand-in (LLM_PROVIDER=fake)";
  if (mode !== "" && mode !== "deepseek") return `unknown provider "${mode}"`;
  return process.env.DEEPSEEK_API_KEY?.trim()
    ? `deepseek:${MODEL_ID}`
    : "no DEEPSEEK_API_KEY set — scoring works, extraction and rewrites will fail";
}
