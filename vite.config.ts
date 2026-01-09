import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-public-files",
      closeBundle() {
        // Copy manifest.json and style.css from public to dist
        const publicDir = resolve(__dirname, "public");
        const distDir = resolve(__dirname, "dist");

        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }

        copyFileSync(
          resolve(publicDir, "manifest.json"),
          resolve(distDir, "manifest.json"),
        );
      },
    },
  ],
  build: {
    outDir: "dist",
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
