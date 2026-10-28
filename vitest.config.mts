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
      // El umbral del 70 % (REQUERIMIENTOS.md §5.2) se activa en la Fase 6,
      // cuando existan las pruebas de carta, pedidos y cuentas.
    },
  },
});
