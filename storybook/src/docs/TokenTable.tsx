import { useEffect, useState } from 'react';

export type TokenRow = {
  /** The CSS custom property, including the leading dashes. */
  name: string;
  /** What the token is for. */
  role: string;
  /** The primitive this semantic token resolves to, if it is an alias. */
  alias?: string;
};

type Kind = 'color' | 'font';

/**
 * Renders a token table with values read from the live stylesheet at runtime,
 * so a value can never disagree with the token that defines it. Only the list
 * of names is maintained by hand.
 */
export function TokenTable({ rows, kind = 'color' }: { rows: TokenRow[]; kind?: Kind }) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const computed = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const row of rows) next[row.name] = computed.getPropertyValue(row.name).trim();
    setValues(next);
  }, [rows]);

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
      <thead>
        <tr>
          <th style={th}>{kind === 'color' ? 'Swatch' : 'Sample'}</th>
          <th style={th}>Token</th>
          <th style={th}>Value</th>
          {rows.some((r) => r.alias) && <th style={th}>Resolves to</th>}
          <th style={th}>Role</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td style={td}>
              {kind === 'color' ? (
                <span
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    width: 56,
                    height: 28,
                    borderRadius: 4,
                    background: `var(${row.name})`,
                    border: '1px solid var(--color-border-subtle)',
                  }}
                />
              ) : (
                <span style={{ fontFamily: `var(${row.name})`, fontSize: 18 }}>Aa 0123</span>
              )}
            </td>
            <td style={{ ...td, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{row.name}</td>
            <td style={{ ...td, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
              {values[row.name] || '…'}
            </td>
            {rows.some((r) => r.alias) && (
              <td style={{ ...td, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{row.alias ?? '—'}</td>
            )}
            <td style={td}>{row.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '1px solid var(--color-border-subtle)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-label)',
};

const td: React.CSSProperties = {
  padding: '10px 12px',
  borderTop: '1px solid var(--color-border)',
  verticalAlign: 'middle',
};
