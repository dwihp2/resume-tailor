import { describe, expect, it } from "vitest";
import { diffWords } from "./diff";

const texts = (tokens: { value: string; changed: boolean }[]) => tokens.map((token) => token.value).join(" ");

describe("diffWords", () => {
  it("marks nothing when the rewrite is identical", () => {
    const { before, after } = diffWords("Built the payments dashboard", "Built the payments dashboard");
    expect(before.every((token) => !token.changed)).toBe(true);
    expect(after.every((token) => !token.changed)).toBe(true);
    expect(texts(after)).toBe("Built the payments dashboard");
  });

  it("marks only the inserted words on the new side", () => {
    const { before, after } = diffWords("Reduced load time", "Reduced report load time by 32 seconds");
    expect(before.every((token) => !token.changed)).toBe(true);
    expect(after.filter((token) => token.changed).map((token) => token.value)).toEqual([
      "report",
      "by",
      "32",
      "seconds",
    ]);
  });

  it("keeps the recovered words in the join when whole clauses are replaced", () => {
    const { before, after } = diffWords("Handled three clients", "Handled six clients for a bank");
    expect(after.filter((token) => token.changed).map((token) => token.value)).toEqual([
      "six",
      "for",
      "a",
      "bank",
    ]);
  });
});
