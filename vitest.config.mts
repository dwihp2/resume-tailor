import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests live next to the code they cover; tests/ belongs to Playwright.
    include: ["lib/**/*.test.ts"],
  },
});
