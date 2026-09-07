import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/form-anatomy/",
  plugins: [react(), tailwindcss()],
  build: {
    // three.js alone is ~700 kB minified; splitting it is a phase 2 concern.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
