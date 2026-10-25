import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths: works at user.github.io/<any-repo>/ without hardcoding the repo name.
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
