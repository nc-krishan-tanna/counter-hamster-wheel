import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built to static files that the web (Caddy) image serves; /v1 and /api/auth are the same origin.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
});
