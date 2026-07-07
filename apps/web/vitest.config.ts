import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["app/**/*.test.{ts,tsx}"],
    reporters: ["agent"],
    silent: "passed-only",
    restoreMocks: true,
    clearMocks: true,
  },
});
