import { expect, test } from "@playwright/test";
import { JD_TEXT } from "./fixtures/jd";
import { buildResumePdf } from "./fixtures/resume-pdf.mjs";

/**
 * A run keeps its resume, its job description and every evaluation, so deleting
 * one is the only way to take anything back out of the tool.
 */
test("deletes a run, its resume and its job description", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("model-label")).toContainText("offline stand-in");

  async function startRun() {
    await page.setInputFiles('[data-testid="resume-file"]', {
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: buildResumePdf(),
    });
    await page.fill('[data-testid="jd-text"]', JD_TEXT);
    await page.click('[data-testid="submit-run"]');
    await page.waitForURL(/\/runs\/[0-9a-f-]+$/);
    return page.url().split("/").pop() ?? "";
  }

  const doomed = await startRun();
  await page.goto("/");
  const before = await page.getByTestId("run-list").locator("li").count();

  // The newest run is first, and deleting it takes two clicks.
  const newest = page.getByTestId("run-list").locator("li").first();
  await expect(newest).toContainText("resume.pdf");
  await newest.getByTestId("delete-run").click();
  await expect(newest.getByTestId("confirm-delete-run")).toBeVisible();

  const deleted = page.waitForResponse(
    (response) => response.request().method() === "DELETE" && response.url().includes("/api/runs/"),
  );
  await newest.getByTestId("confirm-delete-run").click();
  expect((await deleted).ok()).toBeTruthy();

  await expect(page.getByTestId("run-list").locator("li")).toHaveCount(before - 1);

  // And the run itself is gone, not just hidden from the list.
  await page.goto(`/runs/${doomed}`);
  await expect(page.getByText("This page could not be found")).toBeVisible();
});
