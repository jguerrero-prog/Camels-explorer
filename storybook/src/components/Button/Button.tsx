import type { ReactNode } from 'react';
import './Button.css';

export type ButtonProps = {
  /**
   * `primary` is the one high-emphasis committed action in a context: 40px tall,
   * gradient fill, optional icon. `secondary` is a lower-emphasis action inside a
   * panel: outlined, 8px radius, smaller text. The two are different sizes by
   * design, not one shape in two colours.
   */
  variant: 'primary' | 'secondary';
  /** Called on click. */
  onClick?: () => void;
  /** Optional leading icon, rendered at 18x18. Decorative, so pass an empty alt. */
  icon?: ReactNode;
  /** The label. Keep it to the outcome, for example "Add Plot". */
  children: ReactNode;
};

export function Button({ variant, onClick, icon, children }: ButtonProps) {
  return (
    <button type="button" className={`button button--${variant}`} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}
