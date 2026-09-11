import type { Preview } from '@storybook/react-vite'
import '../src/tokens/primitives/color-ramps.css';
import '../src/tokens/primitives/neutrals.css';
import '../src/tokens/primitives/typography.css';
import '../src/tokens/semantic/semantic.css';
import './preview.css';

const preview: Preview = {
  parameters: {
    // Gives the sidebar a real information architecture: orientation first,
    // foundations next, then components grouped by layer, then the reference
    // pages a reader goes to on purpose. See Start here.
    options: {
      storySort: {
        order: [
          'Start here',
          'Foundations', ['Color', 'Typography', 'Elevation, radius and spacing'],
          'Patterns',
          'Statistic sidebars',
          'Primitives',
          'Fields',
          'Charts',
          'Data display',
          'Chrome',
          'Overlays',
          'Flows',
          'Sections',
          'Brand',
          'Reference', ['Content and units', 'Contributing', 'Decision log'],
        ],
      },
    },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;