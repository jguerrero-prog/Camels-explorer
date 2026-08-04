import './Checkbox.css';

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className="checkbox"
      onClick={() => onChange(!checked)}
    >
      <span className={`checkbox__box ${checked ? 'checkbox__box--checked' : ''}`}>
        {checked && <span className="checkbox__check">✓</span>}
      </span>
      <span className="checkbox__label">{label}</span>
    </button>
  );
}
