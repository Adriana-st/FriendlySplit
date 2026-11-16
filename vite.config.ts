import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    setupFiles: './tests/setup.ts',
    // All test files share one test database, so run the files one after another
    fileParallelism: false,
  },
});