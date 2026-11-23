import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 从 /gift-lab/ 提供此仓库。
  base: process.env.VITE_BASE_PATH || "/gift-lab/",
  build: { sourcemap: false },
});
