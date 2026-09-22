import { expect, test } from "@playwright/test";
import { JD_TEXT } from "./fixtures/jd";
import { buildResumePdf } from "./fixtures/resume-pdf.mjs";

const ANSWER = "The programme took 3 years and I finished with a final project graded 4.";

/**
 * Rewriting is one action: type what happened (or paste a draft from your notes)
 * and press the button. With an empty box it only rephrases toward the job's
 * language — it never invents an outcome to fill the gap.
 */
test("rewrites a bullet in one action, with or without a typed answer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("model-label")).toContainText("offline stand-in");
  await page.setInputFiles('[data-testid="resume-file"]', {
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: buildResumePdf(),
  });
  await page.fill('[data-testid="jd-text"]', JD_TEXT);
  await page.click('[data-testid="submit-run"]');
  await page.waitForURL(/\/runs\/[0-9a-f-]+$/);

  const evaluated = page.waitForResponse((response) => response.url().includes("/evaluate"));
  await page.click('[data-testid="score-bullets"]');
  expect((await evaluated).ok()).toBeTruthy();

  const card = page.getByTestId("bullet-card").filter({ hasText: "BSc Computer Science" });
  await expect(card.getByTestId("bullet-question")).toContainText("does not mention");

  // Nothing typed: the rewrite rephrases and adds no facts of its own.
  const bare = page.waitForResponse((response) => response.url().includes("/revision"));
  await card.getByTestId("generate-revision").click();
  expect((await bare).ok()).toBeTruthy();
  const first = card.getByTestId("revision").first();
  await expect(first.getByTestId("revision-text")).toHaveText("BSc Computer Science");
  await expect(card.getByTestId("revision")).toHaveCount(1);

  // Typed answer: one press saves it as the Story and rewrites from it.
  await card.getByTestId("story-input").fill(ANSWER);
  const revised = page.waitForResponse((response) => response.url().includes("/revision"));
  await card.getByTestId("generate-revision").click();
  expect((await revised).ok()).toBeTruthy();

  await expect(card.getByTestId("story-facts")).toContainText("3 years");
  await expect(card.getByTestId("revision")).toHaveCount(2);
  await expect(card.getByTestId("revision").first().getByTestId("revision-text")).toContainText("3 years");
  await expect(card.getByTestId("story-input")).toHaveValue("");

  // And the candidate can keep it, like any other rewrite.
  const accepted = page.waitForResponse((response) => response.url().includes("/api/revisions/"));
  await card.getByTestId("revision").first().getByTestId("accept-revision").click();
  expect((await accepted).ok()).toBeTruthy();
  await expect(card.getByTestId("kept-text")).toContainText("3 years");
});
