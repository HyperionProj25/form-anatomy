import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/form-anatomy/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png", "draco/*", "ATTRIBUTION.md"],
      manifest: {
        name: "Form — Anatomy, connected",
        short_name: "Form",
        description: "A free interactive 3D anatomy atlas with evidence-graded fascial lines.",
        start_url: "/form-anatomy/",
        scope: "/form-anatomy/",
        display: "standalone",
        background_color: "#fafbf7",
        theme_color: "#365646",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,wasm,md}"],
        globIgnores: ["**/body.glb", "**/og.png"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "/form-anatomy/index.html",
        runtimeCaching: [
          {
            // The 8 MB model is cached on first use, not precached, so install stays quick.
            urlPattern: ({ url }) => url.pathname.endsWith("/body.glb"),
            handler: "CacheFirst",
            options: {
              cacheName: "form-model",
              expiration: { maxEntries: 1, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // three.js alone is ~700 kB minified; splitting it is a later concern.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
