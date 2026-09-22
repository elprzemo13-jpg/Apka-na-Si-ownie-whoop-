import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt", not "autoUpdate": a reload in the middle of a workout would
      // be the worst possible moment. The user decides when to take the update.
      registerType: "prompt",
      includeAssets: ["icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Trening",
        short_name: "Trening",
        description: "Tracker treningowy: siłownia, pływanie, bieganie, rower.",
        lang: "pl",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Every route renders from the same shell; the router takes over offline.
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        // Supabase requests are never cached: stale training data would be worse
        // than none, and the local database already answers while offline.
        navigateFallbackDenylist: [/^\/auth\//],
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "supabase/tests/**/*.test.ts"],
  },
});
