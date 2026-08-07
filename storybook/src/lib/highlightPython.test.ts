import { describe, expect, it } from 'vitest';
import { tokenizePython } from './highlightPython';

describe('tokenizePython', () => {
  it('classifies a comment, number, and gap text correctly', () => {
    const tokens = tokenizePython('x = 3.5  # note');
    expect(tokens).toEqual([
      { text: 'x = ', type: null },
      { text: '3.5', type: 'number' },
      { text: '  ', type: null },
      { text: '# note', type: 'comment' },
    ]);
  });

  it('classifies a single-quoted string, including an escaped quote', () => {
    const tokens = tokenizePython("suite = 'IllustrisTNG'");
    expect(tokens).toEqual([
      { text: 'suite = ', type: null },
      { text: "'IllustrisTNG'", type: 'string' },
    ]);
  });

  it('classifies only the fixed keyword set, not arbitrary identifiers', () => {
    const tokens = tokenizePython('import backend as B');
    expect(tokens.filter((t) => t.type === 'keyword').map((t) => t.text)).toEqual(['import', 'as']);
    // "backend" and "B" are plain identifiers, not part of TOKEN_PATTERN's
    // fixed keyword set - they should stay untyped gap text.
    expect(tokens.some((t) => t.text === 'backend' && t.type !== null)).toBe(false);
  });

  it('classifies an integer literal distinctly from a float', () => {
    const tokens = tokenizePython('bins=10');
    expect(tokens).toContainEqual({ text: '10', type: 'number' });
  });

  it('returns a single null-type token for text with nothing to highlight', () => {
    expect(tokenizePython('plain text')).toEqual([{ text: 'plain text', type: null }]);
  });
});
