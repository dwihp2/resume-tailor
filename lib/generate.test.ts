import { describe, expect, it } from "vitest";
import { inventedNumbers } from "./generate";

describe("inventedNumbers", () => {
  it("flags a figure the candidate never stated", () => {
    expect(inventedNumbers("Cut report time by 45 seconds", ["cut report time by 12 seconds"])).toEqual(["45"]);
  });

  it("accepts a figure that came from the bullet or the answer", () => {
    const allowed = ["Rebuilt the dashboard for a team of 4", "we handled 40 drivers"];
    expect(inventedNumbers("Rebuilt the dashboard for a team of 4, serving 40 drivers", allowed)).toEqual([]);
  });

  it("flags every distinct offender once", () => {
    expect(inventedNumbers("Saved 99 hours and 99 dollars", ["saved 3 hours"])).toEqual(["99"]);
  });
});
