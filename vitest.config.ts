import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // A single forked worker keeps memory usage low and predictable in
    // constrained CI/sandbox environments, at the cost of not parallelizing
    // test files — an acceptable tradeoff for a suite this size.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
