import { useState } from 'react';
import './MultiSelect.css';

export type MultiSelectProps = {
  label: string;
  values: string[];
  onRemove: (value: string) => void;
  onAdd: (value: string) => void;
  placeholder?: string;
};

export function MultiSelect({ label, values, onRemove, onAdd, placeholder = 'Add…' }: MultiSelectProps) {
  const [draft, setDraft] = useState('');

  function commitDraft() {
    const trimmed = draft.trim();
    if (trimmed) {
      onAdd(trimmed);
      setDraft('');
    }
  }

  return (
    <div className="multi-select">
      <p className="multi-select__label">{label}</p>
      <div className="multi-select__box">
        {values.map((value) => (
          <button type="button" className="multi-select__chip" key={value} onClick={() => onRemove(value)}>
            <span className="multi-select__chip-value">{value}</span>
            <span className="multi-select__chip-remove">×</span>
          </button>
        ))}
        <input
          className="multi-select__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDraft();
          }}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
