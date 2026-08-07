import { describe, expect, it } from 'vitest';
import { onepRealizationId, parseOnepRealizationId, realizationCountFor } from './useCatalogMetadata';
import type { Catalog } from './useCatalogMetadata';

describe('onepRealizationId / parseOnepRealizationId round-trip', () => {
  it('formats and parses known variations', () => {
    expect(onepRealizationId(11, 2)).toBe('p11_2');
    expect(onepRealizationId(3, -2)).toBe('p3_n2');
    expect(onepRealizationId(1, 0)).toBe('p1_0');
  });

  it('round-trips through both directions', () => {
    const id = onepRealizationId(11, 2);
    expect(parseOnepRealizationId(id)).toEqual({ paramIndex: 11, variation: 2 });
  });

  it('parses a negative-variation id back correctly', () => {
    expect(parseOnepRealizationId('p3_n2')).toEqual({ paramIndex: 3, variation: -2 });
  });

  it('returns null for a non-1P realization id', () => {
    expect(parseOnepRealizationId('garbage')).toBeNull();
    expect(parseOnepRealizationId('42')).toBeNull();
  });
});

describe('realizationCountFor', () => {
  // Only `sets`/`sb_realizations_for_suite` are read by this function - the
  // rest of Catalog is irrelevant noise for this test, so it's cast rather
  // than fully populated (see the type's own real shape in
  // useCatalogMetadata.ts if a future field needs covering here too).
  const catalog = {
    sets: [
      { name: 'LH', label: 'LH · Latin Hypercube', realizations: 1000, description: '' },
      { name: 'CV', label: 'CV · Cosmic Variance', realizations: 27, description: '' },
    ],
    sb_realizations_for_suite: { IllustrisTNG: 2048, Astrid: 1024 },
  } as unknown as Catalog;

  it('reads the SB count from the per-suite map', () => {
    expect(realizationCountFor(catalog, 'SB', 'IllustrisTNG')).toBe(2048);
    expect(realizationCountFor(catalog, 'SB', 'Astrid')).toBe(1024);
  });

  it('returns null for SB on a suite with no real SB set', () => {
    expect(realizationCountFor(catalog, 'SB', 'SIMBA')).toBeNull();
  });

  it('reads non-SB counts from the sets list', () => {
    expect(realizationCountFor(catalog, 'LH', 'IllustrisTNG')).toBe(1000);
    expect(realizationCountFor(catalog, 'CV', 'IllustrisTNG')).toBe(27);
  });

  it('returns null for an unknown set', () => {
    expect(realizationCountFor(catalog, 'NOT_A_SET', 'IllustrisTNG')).toBeNull();
  });

  it('returns null when catalog is null (not yet loaded)', () => {
    expect(realizationCountFor(null, 'LH', 'IllustrisTNG')).toBeNull();
  });
});
