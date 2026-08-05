import './ParamsReadout.css';

export type ParamsReadoutGroup = {
  label: string;
  value: string;
};

export type ParamsReadoutProps = {
  groups: ParamsReadoutGroup[];
};

export function ParamsReadout({ groups }: ParamsReadoutProps) {
  return (
    <div className="params-readout">
      {groups.map((group) => (
        <div className="params-readout__group" key={group.label}>
          <p className="params-readout__label">{group.label}</p>
          <p className="params-readout__value">{group.value}</p>
        </div>
      ))}
    </div>
  );
}
