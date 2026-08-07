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
      // "storybook" project above, despite being fully wired since before
      // this session, turned out to not actually run: `vitest run
      // --project storybook` fails at import time with `SyntaxError: The
      // requested module 'aria-query/lib/index.js' does not provide an
      // export named 'elementRoles'` - a real version-incompatibility
      // between @storybook/addon-vitest and aria-query, confirmed directly
      // by running it, not assumed from the dependency list. Not fixed
      // here (a third-party integration/version issue, not something this
      // pass's scope covers) - this project exists so *some* real,
      // currently-running test coverage exists for the frontend while that
      // gets sorted out separately.
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