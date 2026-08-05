import './Checkbox.css';

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function Checkbox({ label, checked, onChange, disabled = false }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      className={`checkbox ${disabled ? 'checkbox--disabled' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={`checkbox__box ${checked ? 'checkbox__box--checked' : ''}`}>
        {checked && <span className="checkbox__check">✓</span>}
      </span>
      <span className="checkbox__label">{label}</span>
    </button>
  );
}
