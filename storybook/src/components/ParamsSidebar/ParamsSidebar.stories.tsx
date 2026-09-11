import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ParamsSidebar } from './ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { Slider } from '../Slider/Slider';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Checkbox } from '../Checkbox/Checkbox';
import { Button } from '../Button/Button';

const SUITES = ['IllustrisTNG', 'SIMBA', 'Astrid', 'Swift-EAGLE'];
const SETS = ['LH · Latin Hypercube', 'CV · Cosmic Variance', '1P · One-Parameter'];

const meta: Meta<typeof ParamsSidebar> = {
  title: 'Chrome/ParamsSidebar',
  component: ParamsSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '100vh' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ParamsSidebar>;

/** The core three controls every statistic opens with. */
function CoreFields() {
  const [suite, setSuite] = useState('IllustrisTNG');
  const [set, setSet] = useState('LH · Latin Hypercube');
  const [realization, setRealization] = useState(0);
  return (
    <>
      <SelectField label="Suite" value={suite} options={SUITES} onChange={setSuite} />
      <SelectField label="Set" value={set} options={SETS} onChange={setSet} />
      <NumberStepper
        label="Realization"
        value={realization}
        step={1}
        caption="0–999"
        onChange={setRealization}
        formatValue={(v) => String(v)}
      />
    </>
  );
}

/** Power Spectrum: the core three plus this statistic's own controls. */
function PowerSpectrum() {
  const [snapshot, setSnapshot] = useState(33);
  const [grid, setGrid] = useState(512);
  const [compare, setCompare] = useState(false);
  const [mas, setMas] = useState('CIC');
  return (
    <ParamsSidebar title="Power Spectrum" footer={<Button variant="secondary">Remove plot</Button>}>
      <CoreFields />
      <Checkbox label="Compare mode" checked={compare} onChange={setCompare} />
      <Slider label="Snapshot" min={0} max={33} value={snapshot} onChange={setSnapshot} />
      <Slider label="Grid size" min={64} max={512} value={grid} onChange={setGrid} />
      <SelectField label="Mass Assignment Scheme" value={mas} options={['NGP', 'CIC', 'TSC', 'PCS']} onChange={setMas} />
    </ParamsSidebar>
  );
}

export const Default: Story = { render: () => <PowerSpectrum /> };

export const Playground: Story = { render: () => <PowerSpectrum /> };

/** Enough controls to overflow the panel, which reveals the bottom fade. Remove plot stays pinned. */
export const Overflowing: Story = {
  render: () => {
    const [v, setV] = useState(1);
    return (
      <ParamsSidebar title="SFR History" footer={<Button variant="secondary">Remove plot</Button>}>
        <CoreFields />
        {['z min', 'z max', 'Bins', 'Ωm', 'σ8', 'A_SN1', 'A_AGN1', 'A_SN2', 'A_AGN2'].map((label) => (
          <Slider key={label} label={label} min={0} max={10} value={v} onChange={setV} />
        ))}
      </ParamsSidebar>
    );
  },
};

/** Without a footer. The scroll region takes the full height. */
export const NoFooter: Story = {
  render: () => (
    <ParamsSidebar title="Spread Metric">
      <CoreFields />
    </ParamsSidebar>
  ),
};
