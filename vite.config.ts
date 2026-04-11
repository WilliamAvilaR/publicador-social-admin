/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'text-summary', 'html'],
      exclude: [
        '**/*.spec.ts',
        '**/test-setup.ts',
        'src/test-setup.ts',
        '**/*.config.*',
        '**/main.ts',
        'coverage/**',
        'dist/**',
        '**/assets/**',
      ],
      thresholds: {
        lines: 50,
        statements: 50,
        branches: 30,
        functions: 50,
      },
    },
  },
});
