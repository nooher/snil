import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SNIL playground — zero-install Swahili coding in the browser.
export default defineConfig({
  plugins: [react()],
  server: { port: 5200 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as never);
