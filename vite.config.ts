import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this repository from /gift-lab/.
  base: process.env.VITE_BASE_PATH || '/gift-lab/',
  build: { sourcemap: false },
});
