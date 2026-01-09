import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

const browser = process.env.BROWSER || "chrome";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-public-files",
      closeBundle() {
        const publicDir = resolve(__dirname, "public");
        const distDir = resolve(__dirname, `dist-${browser}`);

        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }

        // Copy browser-specific manifest
        copyFileSync(
          resolve(publicDir, `manifest.${browser}.json`),
          resolve(distDir, "manifest.json"),
        );
      },
    },
  ],
  publicDir: false, // Disable automatic public folder copying
  build: {
    outDir: `dist-${browser}`,
    emptyDirOnBuildStart: true,
    rollupOptions: {
      input: {
        moodle: resolve(__dirname, "src/moodle.tsx"),
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
