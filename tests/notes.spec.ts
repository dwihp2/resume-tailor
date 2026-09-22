import { expect, test } from "@playwright/test";
import { JD_TEXT } from "./fixtures/jd";
import { buildResumePdf } from "./fixtures/resume-pdf.mjs";

const NOTES = `At Rushowl I built the driver dashboard and the accounting module. The accounting module cut manual payment handling by 20 percent. I integrated VoIP calling with Sendbird for customer privacy.`;

/**
 * The candidate has already written their career down. Drafting an answer from
 * those notes is the difference between retyping metrics once per bullet and
 * reviewing them — but only the candidate's own saved answer is ever rewritten.
 */
test("drafts an answer from the candidate's notes and refuses when they are silent", async ({ page }) => {
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
  await expect(page.getByTestId("bullet-card")).toHaveCount(6);

  const covered = page.getByTestId("bullet-card").filter({ hasText: "accounting module" });
  const uncovered = page.getByTestId("bullet-card").filter({ hasText: "Muhammad Example" });

  // Nothing to draft from yet, and the button says so.
  await expect(covered.getByTestId("draft-answer")).toBeDisabled();

  await page.getByTestId("notes-input").fill(NOTES);
  const saved = page.waitForResponse((response) => response.url().includes("/api/runs/"));
  await page.getByTestId("save-notes").click();
  expect((await saved).ok()).toBeTruthy();
  await expect(page.getByTestId("notes-status")).toHaveText("Saved");

  // A bullet the notes cover gets a draft, and the source is shown.
  await expect(covered.getByTestId("draft-answer")).toBeEnabled();
  const drafted = page.waitForResponse((response) => response.url().includes("/draft"));
  await covered.getByTestId("draft-answer").click();
  expect((await drafted).ok()).toBeTruthy();
  await expect(covered.getByTestId("story-input")).toHaveValue(/20 percent/);
  await expect(covered.getByTestId("draft-source")).toContainText("From your notes");

  // The candidate still saves it, and only then can it be rewritten.
  const story = page.waitForResponse((response) => response.url().includes("/story"));
  await covered.getByTestId("save-story").click();
  expect((await story).ok()).toBeTruthy();
  await expect(covered.getByTestId("story-facts")).toContainText("20 percent");

  const revision = page.waitForResponse((response) => response.url().includes("/revision"));
  await covered.getByTestId("generate-revision").click();
  expect((await revision).ok()).toBeTruthy();
  await expect(covered.getByTestId("revision-text")).toContainText("20 percent");

  // A bullet the notes say nothing about is refused, not invented.
  await uncovered.getByTestId("draft-answer").click();
  await expect(uncovered.getByTestId("draft-source")).toContainText("say nothing about this bullet");
  await expect(uncovered.getByTestId("story-input")).toHaveValue("");
});
