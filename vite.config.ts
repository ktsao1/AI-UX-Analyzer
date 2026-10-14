import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `base: './'` keeps the built site working from any path, so the sample
// mode can be hosted as static files (GitHub Pages, for one).
export default defineConfig({
  base: './',
  plugins: [react()],
});
