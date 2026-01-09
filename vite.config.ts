import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";

const browser = process.env.BROWSER || "chrome";

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8")
);
const version = packageJson.version;

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

        // Read manifest, update version, and write to dist
        const manifest = JSON.parse(
          readFileSync(resolve(publicDir, `manifest.${browser}.json`), "utf-8")
        );
        manifest.version = version;
        writeFileSync(
          resolve(distDir, "manifest.json"),
          JSON.stringify(manifest, null, 2)
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
