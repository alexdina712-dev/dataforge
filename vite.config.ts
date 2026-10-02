import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: 5176, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8004' } },
  test: { include: ['src/**/*.test.ts'], pool: 'threads', maxWorkers: 1 },
});
