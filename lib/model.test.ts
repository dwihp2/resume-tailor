import { afterEach, describe, expect, it, vi } from "vitest";
import { getModel, modelLabel } from "./model";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getModel", () => {
  it("refuses to run with no key, and says the two ways out", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("LLM_PROVIDER", "");
    expect(() => getModel()).toThrow(/DEEPSEEK_API_KEY/);
  });

  it("uses the offline stand-in when asked", () => {
    vi.stubEnv("LLM_PROVIDER", "fake");
    expect(getModel().name).toBe("fake:lexicon");
  });

  it("rejects a provider it does not know instead of quietly falling back", () => {
    vi.stubEnv("LLM_PROVIDER", "openai");
    expect(() => getModel()).toThrow(/Unknown LLM_PROVIDER/);
  });
});

describe("modelLabel", () => {
  it("names the stand-in so nobody mistakes it for a real model", () => {
    vi.stubEnv("LLM_PROVIDER", "fake");
    expect(modelLabel()).toContain("offline stand-in");
  });

  it("says that scoring still works without a key", () => {
    vi.stubEnv("LLM_PROVIDER", "");
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    expect(modelLabel()).toContain("scoring works");
  });
});
