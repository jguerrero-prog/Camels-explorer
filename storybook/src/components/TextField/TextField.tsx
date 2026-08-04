import './TextField.css';

export type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Real field pattern (Figma node 971:875, "field-Realization"): a short
   * helper line under the input, e.g. the valid range. */
  caption?: string;
  type?: 'text' | 'number';
};

/** A plain editable field - same visual shell as SelectField's trigger, but
 * no chevron/menu, since the real "Realization" field (Figma node
 * 971:875/975:166) is a typed number, not a fixed-list pick. */
export function TextField({ label, value, onChange, caption, type = 'text' }: TextFieldProps) {
  return (
    <div className="text-field">
      <p className="text-field__label">{label}</p>
      <input
        className="text-field__input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {caption && <p className="text-field__caption">{caption}</p>}
    </div>
  );
}
