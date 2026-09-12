import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

/**
 * Dev-only test runner for the app's pure domain logic.
 *
 * This config is intentionally isolated from the Next.js build: nothing under
 * `app/`, `components/`, `src/`, or `lib/` imports these tests, so they never
 * reach a production bundle. Run them with `npm test` (one-shot) or
 * `npm run test:watch`.
 */
export default defineConfig({
  resolve: {
    // Mirrors the `@/*` -> project root mapping in tsconfig.json.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    clearMocks: true,
  },
})
