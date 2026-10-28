import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['test/e2e/**'],
    setupFiles: ['./test/setup-unit.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/*.decorator.ts',
        'src/**/*.strategy.ts',
        'src/**/index.ts',
        'src/generated/**',
      ],
      // La cobertura se mide, pero todavía no hay un umbral mínimo que bloquee el CI.
    },
  },
});
