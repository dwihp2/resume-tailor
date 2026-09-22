import { expect, test } from "@playwright/test";
import { JD_TEXT } from "./fixtures/jd";
import { buildResumePdf } from "./fixtures/resume-pdf.mjs";

/**
 * A real resume arrives as a couple of dozen bullets, most of which are not what
 * the user came for. The groups are what make the loop startable.
 */
test("groups scored bullets so the highest-leverage ones are findable", async ({ page }) => {
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

  // Every bullet is in exactly one place, and the counts say so.
  await expect(page.getByTestId("bullet-card")).toHaveCount(5);
  const chips = page.getByTestId("focus-filters");
  await expect(chips).toContainText("All (5)");
  await expect(chips).toContainText("Overlap gap (4)");
  await expect(chips).toContainText("Already quantified (3)");
  await expect(chips).toContainText("Worth fixing (0)");

  await page.getByTestId("focus-off-target").click();
  await expect(page.getByTestId("bullet-card")).toHaveCount(4);
  await expect(page.getByTestId("overlap-gap").first()).toBeVisible();

  await page.getByTestId("focus-quantified").click();
  await expect(page.getByTestId("bullet-card")).toHaveCount(3);
  await expect(page.getByTestId("evidence-gap")).toHaveCount(0);

  // This fixture has nothing in the middle group; say so instead of showing a blank.
  await page.getByTestId("focus-worth-fixing").click();
  await expect(page.getByTestId("bullet-card")).toHaveCount(0);
  await expect(page.getByTestId("focus-empty")).toBeVisible();

  await page.getByTestId("focus-all").click();
  await expect(page.getByTestId("bullet-card")).toHaveCount(5);
});
