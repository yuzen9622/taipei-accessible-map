import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // tsconfig.json sets "jsx": "preserve" for Next.js's own build pipeline;
  // Vite (this version transforms via oxc, not esbuild) inherits that for
  // .tsx files, which leaves raw JSX untranspiled and breaks Vite's
  // import-analysis parser on any .tsx import. Override just for the test
  // runner (Next.js's build is untouched).
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
