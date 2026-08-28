import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "github-pages",
  base: "/ai-builder-practice/",
  plugins: [react()],
  publicDir: "../public",
  build: { outDir: "../pages-dist", emptyOutDir: true },
});
