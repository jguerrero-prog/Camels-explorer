import { describe, expect, it } from 'vitest';
import { buildCustomFilters, toHaloRows } from './api';
import type { CustomFilterSelection, HaloCatalog } from './api';

describe('buildCustomFilters', () => {
  it('omits any unset field entirely rather than sending a full-range constraint', () => {
    const selection: CustomFilterSelection = { type: '', suite: '', set: '', paramFilters: {} };
    expect(buildCustomFilters(selection)).toEqual({});
  });

  it('includes type/suite/set only when set', () => {
    const selection: CustomFilterSelection = { type: 'FoF halo', suite: 'IllustrisTNG', set: 'LH', paramFilters: {} };
    expect(buildCustomFilters(selection)).toEqual({
      type: 'FoF halo',
      simulation_suite: 'IllustrisTNG',
      simulation_set: 'LH',
    });
  });

  it('maps paramFilters ranges to the real {gte, lte} shape', () => {
    const selection: CustomFilterSelection = {
      type: '', suite: '', set: '',
      paramFilters: { params_Omega_m: { min: 0.1, max: 0.5 } },
    };
    expect(buildCustomFilters(selection)).toEqual({
      params_Omega_m: { gte: 0.1, lte: 0.5 },
    });
  });
});

describe('toHaloRows', () => {
  it('returns an empty array when the catalog is null', () => {
    expect(toHaloRows(null)).toEqual([]);
  });

  it('remaps real column names to camelCase keys', () => {
    const catalog: HaloCatalog = {
      frame: [{
        SubfindID: 42,
        'Stellar Mass [Msun/h]': 1e10,
        'Gas Mass [Msun/h]': 2e10,
        'DM Mass [Msun/h]': 3e10,
        'BH Mass [Msun/h]': 1e8,
        'SFR [Msun/yr]': 1.5,
        'Vmax [km/s]': 200,
        'Stellar Metallicity': 0.02,
      }],
      box_size: 25,
      redshift: 0,
      note: '',
      raw_frame: null,
    };
    expect(toHaloRows(catalog)).toEqual([{
      subfindId: 42, stellarMass: 1e10, gasMass: 2e10, dmMass: 3e10,
      bhMass: 1e8, sfr: 1.5, vmax: 200, stellarMetallicity: 0.02,
    }]);
  });
});
