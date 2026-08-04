import chevron from './assets/chevron.svg';
import './SelectField.css';

export type SelectFieldProps = {
  label: string;
  value: string;
  onClick?: () => void;
};

/** Closed state only - there is no real design yet for the open dropdown
 * menu (option list, hover/selected states). See SelectField.mdx Spec. */
export function SelectField({ label, value, onClick }: SelectFieldProps) {
  return (
    <div className="select-field">
      <p className="select-field__label">{label}</p>
      <button type="button" className="select-field__input" onClick={onClick}>
        <span className="select-field__value">{value}</span>
        <img className="select-field__chevron" src={chevron} alt="" />
      </button>
    </div>
  );
}
