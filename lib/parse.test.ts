import { describe, expect, it } from "vitest";
import { segmentBullets } from "./parse";

describe("segmentBullets", () => {
  it("splits glyph bullets, tracks their section, and hides nothing", () => {
    const bullets = segmentBullets(`SUMMARY
Frontend engineer with six years of experience.

EXPERIENCE
Rushowl — Frontend Engineer
- Built an accounting module used by the finance team
- Integrated VoIP calling into the internal tools dashboard
`);
    expect(bullets.map((bullet) => bullet.text)).toEqual([
      "Frontend engineer with six years of experience.",
      "Rushowl — Frontend Engineer",
      "Built an accounting module used by the finance team",
      "Integrated VoIP calling into the internal tools dashboard",
    ]);
    expect(bullets.map((bullet) => bullet.section)).toEqual([
      "SUMMARY",
      "EXPERIENCE",
      "EXPERIENCE",
      "EXPERIENCE",
    ]);
    expect(bullets.map((bullet) => bullet.order)).toEqual([0, 1, 2, 3]);
  });

  it("rejoins a bullet that the PDF wrapped onto a second line", () => {
    const bullets = segmentBullets(`EXPERIENCE
- Reduced report load time by 32 seconds by refactoring the
  aggregation query and caching the result
- Mentored two juniors
`);
    expect(bullets).toHaveLength(2);
    expect(bullets[0].text).toBe(
      "Reduced report load time by 32 seconds by refactoring the aggregation query and caching the result",
    );
  });

  it("falls back to one bullet per line when a document keeps no glyphs", () => {
    const bullets = segmentBullets(`PROJECTS
Booking API — Go, PostgreSQL
Designed a reservation service handling concurrent bookings
Wrote table-driven tests for the pricing rules
`);
    expect(bullets.map((bullet) => bullet.text)).toEqual([
      "Booking API — Go, PostgreSQL",
      "Designed a reservation service handling concurrent bookings",
      "Wrote table-driven tests for the pricing rules",
    ]);
    expect(bullets.every((bullet) => bullet.section === "PROJECTS")).toBe(true);
  });

  it("keeps a document with no recognisable sections usable", () => {
    const bullets = segmentBullets("- Did a thing\n- Did another thing\n");
    expect(bullets).toHaveLength(2);
    expect(bullets.every((bullet) => bullet.section === null)).toBe(true);
  });

  it("drops standalone date ranges that are not achievements", () => {
    const bullets = segmentBullets(`EXPERIENCE
2021 - 2023
Built the payments dashboard
`);
    expect(bullets.map((bullet) => bullet.text)).toEqual(["Built the payments dashboard"]);
  });
});
