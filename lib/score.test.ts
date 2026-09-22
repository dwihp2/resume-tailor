import { describe, expect, it } from "vitest";
import { SCORING_VERSION, normalizeTerm, scoreBullet, termsMatch } from "./score";
import type { BulletFeatures, JdRequirements } from "./schemas";

const requirements: JdRequirements = {
  skills: ["TypeScript", "React", "PostgreSQL"],
  tools: ["Prisma"],
  domainTerms: ["payments"],
  senioritySignals: ["senior"],
};

const strong: BulletFeatures = {
  skills: ["typescript", "react"],
  tools: ["prisma"],
  action: "rebuilt the payments reconciliation dashboard",
  hasMetric: true,
  metric: { value: 32, unit: "seconds" },
  scope: "team of 4",
};

describe("scoreBullet", () => {
  it("is deterministic across runs", () => {
    const first = scoreBullet(strong, requirements);
    const second = scoreBullet(structuredClone(strong), structuredClone(requirements));
    expect(second).toEqual(first);
    expect(first.scoringVersion).toBe(SCORING_VERSION);
  });

  it("scores a bullet with no overlap as 0 and flags the overlap gap", () => {
    const unrelated: BulletFeatures = {
      skills: ["figma"],
      tools: ["miro"],
      action: "facilitated design workshops",
      hasMetric: false,
      metric: null,
      scope: null,
    };
    const result = scoreBullet(unrelated, requirements);
    expect(result.score).toBe(0);
    expect(result.overlapGap).toBe(true);
    expect(result.evidenceGap).toBe(true);
    expect(result.missing).toEqual(["postgresql", "prisma", "react", "typescript"]);
  });

  it("pays coverage when the resume names the stack differently than the job", () => {
    const result = scoreBullet(
      { ...strong, skills: ["React Native", "TS"], tools: ["postgres"], hasMetric: false, metric: null },
      requirements,
    );
    expect(result.matched).toEqual(["postgresql", "react", "typescript"]);
    expect(result.score).toBeGreaterThan(0);
    expect(result.overlapGap).toBe(false);
  });

  it("pays for a measured result", () => {
    const withoutMetric = scoreBullet({ ...strong, hasMetric: false, metric: null }, requirements);
    const withMetric = scoreBullet(strong, requirements);
    expect(withMetric.score - withoutMetric.score).toBe(25);
    expect(withMetric.evidenceGap).toBe(false);
  });

  it("ignores case, padding and trailing punctuation in terms", () => {
    const messy = scoreBullet(
      { ...strong, skills: ["  TypeScript ", "REACT."], tools: ["prisma,"] },
      requirements,
    );
    expect(messy).toEqual(scoreBullet(strong, requirements));
  });

  it("reports every required term it could not find", () => {
    const partial = scoreBullet({ ...strong, skills: ["typescript"] }, requirements);
    expect(partial.matched).toEqual(["prisma", "typescript"]);
    expect(partial.missing).toEqual(["postgresql", "react"]);
    expect(partial.overlapGap).toBe(false);
  });

  it("keeps a job description with no requirements from dividing by zero", () => {
    const empty = scoreBullet(strong, { skills: [], tools: [], domainTerms: [], senioritySignals: [] });
    expect(Number.isFinite(empty.score)).toBe(true);
    expect(empty.score).toBe(35);
    expect(empty.overlapGap).toBe(true);
  });
});

describe("termsMatch", () => {
  it("matches a technology a resume names differently", () => {
    expect(termsMatch("react", "react native")).toBe(true);
    expect(termsMatch("postgresql", "postgres")).toBe(true);
    expect(termsMatch("node.js", "nodejs")).toBe(true);
    expect(termsMatch("typescript", "ts")).toBe(true);
  });

  it("keeps generic short terms from matching by containment", () => {
    expect(termsMatch("go", "go to market")).toBe(false);
    expect(termsMatch("go", "golang")).toBe(true);
    expect(termsMatch("react", "preact")).toBe(false);
  });

  it("still refuses two genuinely different technologies", () => {
    expect(termsMatch("figma", "postgresql")).toBe(false);
  });
});

describe("normalizeTerm", () => {
  it("preserves c++ and c# while folding punctuation", () => {
    expect(normalizeTerm("C++")).toBe("c++");
    expect(normalizeTerm("C#")).toBe("c#");
    expect(normalizeTerm("Node.js.")).toBe("node.js");
    expect(normalizeTerm("Next.js, ")).toBe("next.js");
  });
});
