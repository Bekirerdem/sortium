import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "scoreboard — internet markets",
        short_name: "scoreboard",
        theme_color: "#0d0e0b",
        background_color: "#0d0e0b",
        display: "standalone",
        icons: [
          { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: { navigateFallback: "/index.html" },
    }),
  ],
});
