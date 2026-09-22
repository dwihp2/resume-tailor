import { describe, expect, it } from "vitest";
import { segmentBullets } from "./parse";

describe("segmentBullets", () => {
  it("keeps a job, its employer and its bulleted responsibilities as one bullet", () => {
    const bullets = segmentBullets(`SUMMARY
Frontend engineer with six years of experience.

EXPERIENCE
Rushowl — Frontend Engineer
- Built an accounting module used by the finance team
- Integrated VoIP calling into the internal tools dashboard
`);
    expect(bullets.map((bullet) => bullet.text)).toEqual([
      "Frontend engineer with six years of experience.",
      "Rushowl — Frontend Engineer Built an accounting module used by the finance team Integrated VoIP calling into the internal tools dashboard",
    ]);
    expect(bullets.map((bullet) => bullet.section)).toEqual(["Summary", "Experience"]);
    expect(bullets.map((bullet) => bullet.order)).toEqual([0, 1]);
  });

  it("keeps one experience entry — date, employer and every wrapped responsibility — as one bullet", () => {
    const bullets = segmentBullets(`EXPERIENCE
08/2025 - 05/2026Mid Frontend Developer (Full-time)
Geniebook Pte Ltd.
Leveraged AI assistants (GitHub Copilot, Claude) for rapid prototyping, significantly
increasing feature delivery speed.
Migrated legacy assessment tools into a unified internal system with a modernized UI.
Launched AI marking and commenting features providing feedback in 32 seconds.
08/2024 - 08/2025Frontend Developer
Rushowl
Built the driver dashboard used by 40 drivers.
`);
    expect(bullets).toHaveLength(2);
    expect(bullets[0].text).toContain("08/2025 - 05/2026 Mid Frontend Developer (Full-time)");
    expect(bullets[0].text).toContain("Geniebook Pte Ltd.");
    expect(bullets[0].text).toContain("increasing feature delivery speed.");
    expect(bullets[0].text).toContain("Launched AI marking and commenting features");
    expect(bullets[1].text).toContain("08/2024 - 08/2025 Frontend Developer");
    expect(bullets[1].text).toContain("Built the driver dashboard used by 40 drivers.");
    expect(bullets.every((bullet) => bullet.section === "Experience")).toBe(true);
  });

  it("starts a new job when a title sits above its own bullet list", () => {
    const bullets = segmentBullets(`EXPERIENCE
Rushowl - Frontend Engineer
- Built the driver dashboard
- Integrated VoIP calling
Geniebook - Frontend Engineer
- Launched AI marking features in 32 seconds
`);
    expect(bullets).toHaveLength(2);
    expect(bullets[0].text).toBe("Rushowl - Frontend Engineer Built the driver dashboard Integrated VoIP calling");
    expect(bullets[1].text).toBe("Geniebook - Frontend Engineer Launched AI marking features in 32 seconds");
  });

  it("starts an entry from a title sitting above its date", () => {
    const bullets = segmentBullets(`EXPERIENCE
Frontend Engineer
Geniebook
08/2025 - 05/2026
Built the assessment tools.
`);
    expect(bullets).toHaveLength(1);
    expect(bullets[0].text).toBe("Frontend Engineer Geniebook 08/2025 - 05/2026 Built the assessment tools.");
  });

  it("makes one bullet of a whole list section", () => {
    const bullets = segmentBullets(`SKILLS
React
TypeScript
PostgreSQL
LANGUAGES
English
Indonesian
`);
    expect(bullets.map((bullet) => bullet.section)).toEqual(["Skills", "Languages"]);
    expect(bullets.map((bullet) => bullet.text)).toEqual(["React TypeScript PostgreSQL", "English Indonesian"]);
  });

  it("splits education into one bullet per school", () => {
    const bullets = segmentBullets(`EDUCATION
08/2017 - 10/2021Mechatronics, Robotics, And Automation Engineering
Politeknik Negeri Batam
06/2014 - 06/2017Software Engineering
SMK Negeri 1 Batam
`);
    expect(bullets).toHaveLength(2);
    expect(bullets[0].text).toContain("Politeknik Negeri Batam");
    expect(bullets[1].text).toContain("SMK Negeri 1 Batam");
  });

  it("keeps a heading-less project's lines as one entry", () => {
    const bullets = segmentBullets(`PROJECTS
Booking API — Go, PostgreSQL
Designed a reservation service handling concurrent bookings
Wrote table-driven tests for the pricing rules
`);
    expect(bullets).toHaveLength(1);
    expect(bullets[0].section).toBe("Projects");
    expect(bullets[0].text).toBe(
      "Booking API — Go, PostgreSQL Designed a reservation service handling concurrent bookings Wrote table-driven tests for the pricing rules",
    );
  });

  it("keeps a flat list of achievements one bullet each", () => {
    const bullets = segmentBullets(`EXPERIENCE
- Reduced report load time by 32 seconds by refactoring the
  aggregation query and caching the result
- Mentored two juniors
`);
    expect(bullets).toHaveLength(2);
    expect(bullets[0].text).toBe(
      "Reduced report load time by 32 seconds by refactoring the aggregation query and caching the result",
    );
    expect(bullets[1].text).toBe("Mentored two juniors");
  });

  it("carries an entry's date line into its bullet", () => {
    const bullets = segmentBullets(`EXPERIENCE
2021 - 2023
Built the payments dashboard
`);
    expect(bullets).toHaveLength(1);
    expect(bullets[0].text).toBe("2021 - 2023 Built the payments dashboard");
  });

  it("keeps a document with no recognisable sections usable", () => {
    const bullets = segmentBullets("- Did a thing\n- Did another thing\n");
    expect(bullets).toHaveLength(2);
    expect(bullets.every((bullet) => bullet.section === null)).toBe(true);
    expect(bullets.map((bullet) => bullet.text)).toEqual(["Did a thing", "Did another thing"]);
  });

  it("canonicalises a heading the extractor split inside a word", () => {
    const bullets = segmentBullets(`SUMM ARY
Frontend engineer with six years of experience.
L ANGUAGES
English, Indonesian
`);
    expect(bullets.map((bullet) => bullet.section)).toEqual(["Summary", "Languages"]);
    expect(bullets.map((bullet) => bullet.text)).toEqual([
      "Frontend engineer with six years of experience.",
      "English, Indonesian",
    ]);
  });
});
