import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SNIL playground — zero-install Swahili coding in the browser.
export default defineConfig({
  plugins: [react()],
  server: { port: 5200 },
  // fileParallelism off: cli.test.ts spawns node subprocesses; running test files
  // in parallel caused subprocess contention. Suite is fast (~7s) so this is fine.
  test: { environment: 'node', include: ['src/**/*.test.ts'], fileParallelism: false },
} as never);
