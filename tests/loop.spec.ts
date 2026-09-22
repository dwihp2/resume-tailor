import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { JD_TEXT } from "./fixtures/jd";
import { buildResumePdf } from "./fixtures/resume-pdf.mjs";

const ANSWER =
  "The dashboard was used by 40 drivers and cut manual checks by 3 hours per week for the operations team.";

const RESPONSE = {
  evaluate: /\/evaluate$/,
  story: /\/story$/,
  generate: /\/revision$/,
  decide: /\/api\/revisions\//,
};

async function startRun(page: Page) {
  await page.goto("/");
  // Deterministic by construction: these specs only hold against the offline
  // stand-in, and a live model would burn credits and shift the scores.
  await expect(page.getByTestId("model-label")).toContainText("offline stand-in");
  await page.setInputFiles('[data-testid="resume-file"]', {
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: buildResumePdf(),
  });
  await page.fill('[data-testid="jd-text"]', JD_TEXT);
  await page.click('[data-testid="submit-run"]');
  await page.waitForURL(/\/runs\/[0-9a-f-]+$/);

  const evaluate = page.waitForResponse((response) => RESPONSE.evaluate.test(response.url()));
  await page.click('[data-testid="score-bullets"]');
  expect((await evaluate).ok()).toBeTruthy();
  await expect(page.getByTestId("bullet-card")).toHaveCount(6);
}

test("turns an unanswered weak bullet into an accepted rewrite, then rejects and retries", async ({ page }) => {
  await startRun(page);

  // The worst bullet is first and carries both gaps.
  const card = page.getByTestId("bullet-card").first();
  await expect(card.getByTestId("bullet-question")).toBeVisible();
  await expect(card.getByTestId("generate-revision")).toBeDisabled();

  await card.getByTestId("story-input").fill(ANSWER);
  const saved = page.waitForResponse((response) => RESPONSE.story.test(response.url()));
  await card.getByTestId("save-story").click();
  expect((await saved).ok()).toBeTruthy();
  await expect(card.getByTestId("story-facts")).toContainText("40 drivers");

  // Rewrite, and prove it only says what the candidate said.
  const generated = page.waitForResponse((response) => RESPONSE.generate.test(response.url()));
  await card.getByTestId("generate-revision").click();
  expect((await generated).ok()).toBeTruthy();

  const first = card.getByTestId("revision").first();
  const firstText = await first.getByTestId("revision-text").textContent();
  expect(firstText).toContain("40 drivers");
  expect(firstText).not.toMatch(/\b(?:99|75|50)\b/);

  const accepted = page.waitForResponse((response) => RESPONSE.decide.test(response.url()));
  await first.getByTestId("accept-revision").click();
  expect((await accepted).ok()).toBeTruthy();

  await expect(card.getByTestId("kept-text")).toContainText("40 drivers");
  await card.getByTestId("copy-kept").click();
  await expect(card.getByTestId("copy-status")).toHaveText("Copied");
  await expect(page.getByTestId("copy-all-kept")).toContainText("(1)");

  // A rejection must not dead-end: the old revision stays, a new one can follow.
  const second = page.waitForResponse((response) => RESPONSE.generate.test(response.url()));
  await card.getByTestId("generate-revision").click();
  expect((await second).ok()).toBeTruthy();
  await expect(card.getByTestId("revision")).toHaveCount(2);

  const newest = card.getByTestId("revision").first();
  const rejected = page.waitForResponse((response) => RESPONSE.decide.test(response.url()));
  await newest.getByTestId("reject-revision").click();
  expect((await rejected).ok()).toBeTruthy();
  await expect(card.getByTestId("revision")).toHaveCount(2);
  await expect(card.getByTestId("revision").last()).toHaveAttribute("data-decision", "accepted");
  await expect(card.getByTestId("revision").first()).toHaveAttribute("data-decision", "rejected");

  // Editing keeps the candidate's own wording, not the model's.
  const third = page.waitForResponse((response) => RESPONSE.generate.test(response.url()));
  await card.getByTestId("generate-revision").click();
  expect((await third).ok()).toBeTruthy();
  const target = card.getByTestId("revision").first();
  await target.getByTestId("edit-revision").click();
  await target
    .getByTestId("revision-edit-input")
    .fill("Rebuilt the driver dashboard, cutting weekly checks by 3 hours");
  const edited = page.waitForResponse((response) => RESPONSE.decide.test(response.url()));
  await target.getByTestId("save-edit").click();
  expect((await edited).ok()).toBeTruthy();
  await expect(card.getByTestId("kept-text")).toContainText("cutting weekly checks by 3 hours");
});

test("re-scoring the same resume and job description reproduces the same scores", async ({ page }) => {
  await startRun(page);

  const scores = () =>
    page
      .getByTestId("bullet-card")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-score")));

  const before = await scores();
  expect(before).toHaveLength(6);

  await page.getByText("Segmentation", { exact: false }).click();
  const evaluate = page.waitForResponse((response) => RESPONSE.evaluate.test(response.url()));
  await page.click('[data-testid="score-bullets"]');
  expect((await evaluate).ok()).toBeTruthy();

  await expect(page.getByTestId("progress")).toContainText("6 scored");
  expect(await scores()).toEqual(before);
});
