import { describe, expect, it } from 'vitest';
import { labelFromTitleUnits, stripLatexDelims } from './customFieldFormat';

describe('stripLatexDelims', () => {
  it('strips outer LaTeX delimiters', () => {
    expect(stripLatexDelims('\\(10^{10}M_\\odot/h\\)')).toBe('10^{10}M_\\odot/h');
  });

  it('leaves plain text untouched', () => {
    expect(stripLatexDelims('Stellar mass')).toBe('Stellar mass');
  });

  it('only strips the outer delimiters, not inner macros', () => {
    // Real, documented gap (see the function's own comment) - inner macros
    // like \odot/_{\rm BH} are deliberately left as-is.
    expect(stripLatexDelims('\\(\\dot{M}_{\\rm BH}\\)')).toBe('\\dot{M}_{\\rm BH}');
  });
});

describe('labelFromTitleUnits', () => {
  it('formats title with units in brackets', () => {
    expect(labelFromTitleUnits('Mass', 'Msun/h')).toBe('Mass [Msun/h]');
  });

  it('omits brackets entirely when units are absent', () => {
    expect(labelFromTitleUnits('Type')).toBe('Type');
  });

  it('strips LaTeX delimiters from both title and units', () => {
    expect(labelFromTitleUnits('\\(Mass\\)', '\\(10^{10}M_\\odot/h\\)')).toBe('Mass [10^{10}M_\\odot/h]');
  });
});
