import { expect, test } from "@playwright/test";
import { JD_TEXT } from "./fixtures/jd";
import { buildResumePdf } from "./fixtures/resume-pdf.mjs";

/**
 * A skill list or a contact block arrives as a dozen rows that will never score
 * well. Clearing them one at a time is the difference between starting the loop
 * and giving up, so a whole section can go in one confirmed action.
 */
test("clears a whole noisy section in one confirmed action", async ({ page, request }) => {
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

  const rows = page.getByTestId("segmentation-row");
  const tools = page.getByTestId("section-tools");
  await expect(rows).toHaveCount(5);
  // The header above the first heading never became a bullet, so there is no
  // headingless group to drop.
  await expect(page.getByTestId("segmentation-list")).not.toContainText("Muhammad Example");

  // The fixture has two jobs in Experience; every other section holds one
  // bullet, which the per-row Drop button already covers.
  await expect(tools).toContainText("Experience (2)");
  await expect(tools).not.toContainText("Summary");
  await expect(tools).not.toContainText("No section");

  // Two steps, because there is no undo for two bullets.
  await page.getByTestId("drop-section-Experience").click();
  const confirmed = page.waitForResponse((response) => response.url().includes("/drop-section"));
  await page.getByTestId("confirm-drop-section-Experience").click();
  const response = await confirmed;
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).removed).toBe(2);

  await expect(rows).toHaveCount(3);
  await expect(tools).toHaveCount(0);
  await expect(page.getByTestId("progress")).toContainText("3 bullets");

  // Dropping the headingless group is still offered by the API, and now finds
  // nothing, because the header was never imported as content.
  const resumeId = await page.getByTestId("segmentation-list").getAttribute("data-resume-id");
  const headingless = await request.post(`/api/resumes/${resumeId}/drop-section`, {
    data: { section: null },
  });
  expect(headingless.ok()).toBeTruthy();
  expect((await headingless.json()).removed).toBe(0);

  await page.reload();
  await expect(page.getByTestId("segmentation-row")).toHaveCount(3);
  await expect(page.getByTestId("segmentation-list")).toContainText("Rebuilt the reporting dashboard");
});
