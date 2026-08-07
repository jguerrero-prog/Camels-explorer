import { describe, expect, it } from 'vitest';
import {
  EMPTY_CUSTOM_SELECTION, fieldsForType, filterTreeForType, isCustomSelectionComplete, toggleCustomFilterField,
} from './CustomFieldsForm';
import type { CustomField } from '../../lib/api';
import type { CustomFieldTreeNode } from '../../lib/api';

const FIELDS: CustomField[] = [
  { name: 'Group_Mass', title: 'Group_Mass', type: 'float', dtype: 'float32' },
  { name: 'Subhalo_Mass', title: 'Subhalo_Mass', type: 'float', dtype: 'float32' },
  { name: 'params_Omega_m', title: 'Omega_m', type: 'float', dtype: 'float32' },
  { name: 'simulation_suite', title: 'Suite', type: 'enum', dtype: 'int' },
  { name: 'snapshot', title: 'Snapshot', type: 'int', dtype: 'int' },
  { name: '_id', title: 'id', type: 'string', dtype: 'string' },
];

describe('fieldsForType', () => {
  it('keeps Group_* + params_* + always-relevant fields for FoF halo', () => {
    const names = fieldsForType(FIELDS, 'FoF halo').map((f) => f.name);
    expect(names).toEqual(['Group_Mass', 'params_Omega_m', 'simulation_suite', 'snapshot']);
  });

  it('keeps Subhalo_* instead of Group_* for Subhalo', () => {
    const names = fieldsForType(FIELDS, 'Subhalo').map((f) => f.name);
    expect(names).toEqual(['Subhalo_Mass', 'params_Omega_m', 'simulation_suite', 'snapshot']);
  });

  it('always excludes internal-only fields regardless of type', () => {
    expect(fieldsForType(FIELDS, 'FoF halo').some((f) => f.name === '_id')).toBe(false);
    expect(fieldsForType(FIELDS, 'Subhalo').some((f) => f.name === '_id')).toBe(false);
  });
});

describe('filterTreeForType', () => {
  const tree: CustomFieldTreeNode[] = [
    { name: 'params', title: 'params' },
    { name: 'Group', title: 'Group' },
    { name: 'Subhalo', title: 'Subhalo' },
  ];

  it('narrows to params + the matching family branch', () => {
    expect(filterTreeForType(tree, 'FoF halo').map((n) => n.name)).toEqual(['params', 'Group']);
    expect(filterTreeForType(tree, 'Subhalo').map((n) => n.name)).toEqual(['params', 'Subhalo']);
  });

  it('returns an empty array with no tree or no type selected yet', () => {
    expect(filterTreeForType(null, 'FoF halo')).toEqual([]);
    expect(filterTreeForType(tree, '')).toEqual([]);
  });
});

describe('toggleCustomFilterField', () => {
  it('adds a field not yet active', () => {
    const result = toggleCustomFilterField(EMPTY_CUSTOM_SELECTION, 'params_Omega_m');
    expect(result.activeFilterFields).toEqual(['params_Omega_m']);
  });

  it('removing an active field also drops its paramFilters entry', () => {
    const withField = {
      ...EMPTY_CUSTOM_SELECTION,
      activeFilterFields: ['params_Omega_m'],
      paramFilters: { params_Omega_m: { min: 0.1, max: 0.5 } },
    };
    const result = toggleCustomFilterField(withField, 'params_Omega_m');
    expect(result.activeFilterFields).toEqual([]);
    expect(result.paramFilters).toEqual({});
  });
});

describe('isCustomSelectionComplete', () => {
  const base = { ...EMPTY_CUSTOM_SELECTION, type: 'FoF halo' as const, xField: 'Group_Mass' };

  it('histogram only needs type + xField', () => {
    expect(isCustomSelectionComplete({ ...base, chartType: 'histogram' })).toBe(true);
  });

  it('scatter3d needs both yField and zField', () => {
    expect(isCustomSelectionComplete({ ...base, chartType: 'scatter3d', yField: 'a' })).toBe(false);
    expect(isCustomSelectionComplete({ ...base, chartType: 'scatter3d', yField: 'a', zField: 'b' })).toBe(true);
  });

  it('scatter (default) needs yField', () => {
    expect(isCustomSelectionComplete({ ...base, chartType: 'scatter' })).toBe(false);
    expect(isCustomSelectionComplete({ ...base, chartType: 'scatter', yField: 'a' })).toBe(true);
  });

  it('is false with no type or no xField regardless of chart type', () => {
    expect(isCustomSelectionComplete({ ...EMPTY_CUSTOM_SELECTION, chartType: 'histogram' })).toBe(false);
  });
});
