import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    alias: {
      obsidian: new URL("./tests/__mocks__/obsidian.ts", import.meta.url).pathname,
    },
  },
});
