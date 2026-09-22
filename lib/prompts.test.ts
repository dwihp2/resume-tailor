import { describe, expect, it } from "vitest";
import { gapQuestion, revisionPrompt } from "./prompts";

describe("gapQuestion", () => {
  it("names the job's terms the bullet does not reflect", () => {
    const question = gapQuestion({ overlapGap: true, evidenceGap: true }, "Built an accounting module", [
      "next.js",
      "postgresql",
      "prisma",
      "react",
    ]);
    expect(question).toContain("Built an accounting module");
    expect(question).toContain("It does not mention next.js, postgresql, prisma.");
    expect(question).not.toContain("react");
  });

  it("asks only for a result when the bullet already reflects the job", () => {
    const question = gapQuestion({ overlapGap: false, evidenceGap: true }, "Rebuilt the dashboard in React", [
      "react",
    ]);
    expect(question).toContain("measured outcome");
    expect(question).not.toContain("does not mention");
  });
});

describe("revisionPrompt", () => {
  const base = {
    bullet: "Built an accounting module",
    jobTitleHint: "Fullstack Engineer",
    question: "What was the outcome?",
    storyFacts: ["cut manual payment handling by 20 percent"],
    missingTerms: [],
  };

  it("steers toward the missing terms without allowing invention", () => {
    const prompt = revisionPrompt({ ...base, missingTerms: ["postgresql", "prisma"] });
    expect(prompt).toContain("This job asks for postgresql, prisma");
    expect(prompt).toContain("only if the candidate's own words above show they used it");
    expect(prompt).toContain("A number that appears in neither must not appear in the rewrite.");
  });

  it("says nothing about missing terms when there are none", () => {
    expect(revisionPrompt(base)).not.toContain("This job asks for");
  });

  it("tells the model to rephrase only when no answer was given", () => {
    const prompt = revisionPrompt({ ...base, storyFacts: [] });
    expect(prompt).toContain("sharpen the wording only");
    expect(prompt).toContain("(none stated)");
  });
});
