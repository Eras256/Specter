import { defineConfig } from 'vitest/config';

/**
 * Two Vitest projects:
 *  - "unit"     → all *.test.ts (unit + integration), the default `pnpm test`.
 *  - "security" → the red-team suite (*.security.test.ts), run via
 *                 `pnpm test:security`. This is the moat; it is first-class.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**', '**/*.security.test.ts'],
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        test: {
          name: 'security',
          include: ['packages/**/*.security.test.ts', 'apps/**/*.security.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
});
