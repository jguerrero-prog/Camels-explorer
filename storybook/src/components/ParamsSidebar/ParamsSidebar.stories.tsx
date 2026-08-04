import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ParamsSidebar } from './ParamsSidebar';
import { SelectField } from '../SelectField/SelectField';
import { Slider } from '../Slider/Slider';
import { NumberStepper } from '../NumberStepper/NumberStepper';
import { Checkbox } from '../Checkbox/Checkbox';

const meta: Meta<typeof ParamsSidebar> = {
  title: 'App Shell/ParamsSidebar',
  component: ParamsSidebar,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '100vh' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ParamsSidebar>;

// Field labels/values are generic, not the real Figma copy (Suite/
// IllustrisTNG, Set/LH, Realization, Compare mode) - see ParamsSidebar.mdx
// Usecase for where the real, confirmed field names are documented in prose.
// panelLabel/title are left as real structural context (which panel, which
// statistic), not a control label this rule is about.
function Interactive() {
  const [select1, setSelect1] = useState('Selected value');
  const [select2, setSelect2] = useState('Selected value');
  const [sliderValue, setSliderValue] = useState(278);
  const [stepperValue, setStepperValue] = useState(10.0);
  const [checked, setChecked] = useState(false);

  return (
    <ParamsSidebar panelLabel="PANEL 1 · FOCUSED" title="SFR History">
      <SelectField label="Select label 1" value={select1} options={['Selected value', 'Option B', 'Option C']} onChange={setSelect1} />
      <SelectField label="Select label 2" value={select2} options={['Selected value', 'Option B', 'Option C']} onChange={setSelect2} />
      <Slider label="Slider label" min={0} max={999} value={sliderValue} onChange={setSliderValue} />
      <NumberStepper label="Number label" value={stepperValue} step={0.1} onChange={setStepperValue} formatValue={(v) => v.toFixed(1)} />
      <Checkbox label="Checkbox label" checked={checked} onChange={setChecked} />
    </ParamsSidebar>
  );
}

export const Playground: Story = {
  render: () => <Interactive />,
};
