/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  // Real fix (2026-08-08, issue #23): the "storybook" project below used to
  // fail at import time for every story file - `SyntaxError: The requested
  // module 'aria-query/lib/index.js' does not provide an export named
  // 'elementRoles'`. Root cause: @testing-library/dom's real ESM build does
  // `import { elementRoles, roles, roleElements } from 'aria-query'` (and
  // separately `import lzString from 'lz-string'`) - both are plain CJS
  // packages, and Vite's on-demand dependency crawler was serving their raw
  // (untransformed) source directly to the browser instead of pre-bundling
  // them into a real ESM-compatible shim, so the browser's own native ESM
  // loader correctly found no such export in the raw CJS file. Confirmed
  // directly (not assumed) that bumping aria-query's own version alone does
  // NOT fix this - the fix is forcing Vite to eagerly crawl and pre-bundle
  // @testing-library/dom's own full CJS dependency chain up front, which
  // then correctly resolves every transitive CJS import (aria-query,
  // lz-string, and any others) together, rather than piecemeal as each is
  // first encountered.
  optimizeDeps: {
    include: ['@testing-library/dom', '@testing-library/jest-dom'],
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
        // The plugin will run tests for the stories defined in your Storybook config
        // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
        storybookTest({
          configDir: path.join(dirname, '.storybook')
        })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{
              browser: 'chromium'
            }]
          }
        }
      },
      // Real addition (2026-08-06, code-quality audit): this project runs
      // plain Node-environment unit tests for src/lib's pure functions
      // (`*.test.ts`, no React, no browser) - added because the
      // "storybook" project above was broken at the time (see its own
      // fix comment above, issue #23) and this project existed so *some*
      // real, currently-running test coverage existed for the frontend
      // while that got sorted out. Both projects run today - `npm test`
      // (CI's own `unit` project) stays scoped to these pure-function
      // tests; `npm run test:storybook` (also wired into CI as of #23)
      // covers every story file.
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
    ]
  }
});