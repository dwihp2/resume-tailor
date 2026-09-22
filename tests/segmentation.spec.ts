import { expect, test } from "@playwright/test";
import { JD_TEXT } from "./fixtures/jd";
import { buildResumePdf } from "./fixtures/resume-pdf.mjs";

/**
 * The editor is what makes the scores trustworthy: whatever the PDF extractor
 * gets wrong, the user fixes here before anything is scored (spec §Acceptance 1).
 */
test("edits, merges, reorders, drops and adds bullets before scoring", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles('[data-testid="resume-file"]', {
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: buildResumePdf(),
  });
  await page.fill('[data-testid="jd-text"]', JD_TEXT);
  await page.click('[data-testid="submit-run"]');
  await page.waitForURL(/\/runs\/[0-9a-f-]+$/);

  const rows = page.getByTestId("segmentation-row");
  const texts = page.getByTestId("bullet-text");
  const settle = () => page.waitForResponse((response) => response.url().includes("/api/bullets"));
  await expect(rows).toHaveCount(8);

  // Edit: the header line the extractor read as a bullet becomes a real headline.
  await expect(page.getByTestId("save-bullet").first()).toBeDisabled();
  await texts.first().fill("Muhammad Example — Senior Fullstack Engineer");
  const edited = settle();
  await page.getByTestId("save-bullet").first().click();
  expect((await edited).ok()).toBeTruthy();
  await expect(rows).toHaveCount(8);
  await expect(texts.first()).toHaveValue("Muhammad Example — Senior Fullstack Engineer");

  // Merge: a bullet the PDF split across two lines becomes one scoreable row.
  const merged = settle();
  await page.getByTestId("merge-bullet").nth(4).click();
  expect((await merged).ok()).toBeTruthy();
  await expect(rows).toHaveCount(7);
  await expect(texts.nth(3)).toHaveValue(/accounting module .*VoIP calling/);

  // Reorder: the merged row moves above the one before it.
  const moved = settle();
  await page.getByTestId("move-up").nth(3).click();
  expect((await moved).ok()).toBeTruthy();
  await expect(texts.nth(2)).toHaveValue(/accounting module .*VoIP calling/);

  // Drop: a line that is not an achievement leaves the resume.
  const dropped = settle();
  await page.getByTestId("drop-bullet").first().click();
  expect((await dropped).ok()).toBeTruthy();
  await expect(rows).toHaveCount(6);
  await expect(texts.first()).toHaveValue(/Frontend engineer with six years/);

  // Add: text the extractor lost entirely can be restored by hand.
  await page.getByTestId("add-bullet-input").fill("Led the migration off the legacy .NET tools");
  const added = settle();
  await page.getByTestId("add-bullet").click();
  expect((await added).ok()).toBeTruthy();
  await expect(rows).toHaveCount(7);
  await expect(texts.last()).toHaveValue("Led the migration off the legacy .NET tools");

  // Only what survived the editor gets scored.
  const evaluated = page.waitForResponse((response) => response.url().includes("/evaluate"));
  await page.getByTestId("score-bullets").click();
  expect((await evaluated).ok()).toBeTruthy();
  await expect(page.getByTestId("bullet-card")).toHaveCount(7);

  // The run list is the way back in, and it reports the same counts.
  await page.click("text=← All runs");
  const entry = page.getByTestId("run-list").locator("li").first();
  await expect(entry).toContainText("resume.pdf");
  await expect(entry).toContainText("7 scored");
});
