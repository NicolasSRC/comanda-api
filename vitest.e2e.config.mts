import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/e2e/**/*.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['./test/e2e/setup-env.ts'],
  },
});
