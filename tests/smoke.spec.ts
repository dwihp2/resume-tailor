import { expect, test } from "@playwright/test";
import { JD_TEXT } from "./fixtures/jd";
import { buildResumePdf } from "./fixtures/resume-pdf.mjs";

test("uploads a resume, segments it, and scores every bullet against a job description", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("model-label")).toContainText("offline stand-in");

  await page.setInputFiles('[data-testid="resume-file"]', {
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: buildResumePdf(),
  });
  await page.fill('[data-testid="jd-text"]', JD_TEXT);
  await page.fill('[data-testid="role-title"]', "Senior Fullstack Engineer");
  await page.click('[data-testid="submit-run"]');

  await page.waitForURL(/\/runs\/[0-9a-f-]+$/);
  await expect(page.getByTestId("progress")).toContainText("0 scored");

  // The header above the first heading is left out, so what remains is one
  // bullet per job with its responsibilities, plus summary, project and degree.
  await expect(page.getByTestId("segmentation-row")).toHaveCount(5);
  await expect(page.getByTestId("segmentation-list")).toContainText("Built an accounting module");
  await expect(page.getByTestId("segmentation-list")).toContainText("Frontend engineer with six years");
  await expect(page.getByTestId("segmentation-list")).not.toContainText("Muhammad Example");

  await page.click('[data-testid="score-bullets"]');
  await expect(page.getByTestId("progress")).toContainText("5 scored");

  const cards = page.getByTestId("bullet-card");
  await expect(cards).toHaveCount(5);

  // Worst first, and the bullet naming the job's stack must clearly beat the
  // bullet that names none of it.
  const scores = await cards.evaluateAll((nodes) =>
    nodes.map((node) => Number(node.getAttribute("data-score"))),
  );
  expect(scores).toEqual([...scores].sort((a, b) => a - b));
  expect(scores.at(-1)).toBeGreaterThan(60);
  expect(scores[0]).toBeLessThan(30);

  await expect(page.getByTestId("overlap-gap").first()).toBeVisible();
  await expect(page.getByTestId("bullet-question").first()).toBeVisible();
});
