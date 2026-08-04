import type { ReactNode } from 'react';
import './Button.css';

export type ButtonProps = {
  /** "primary" is real from TopNav's "Add Plot" (gradient, 40px, icon).
   * "secondary" is real from the params sidebar's "Remove plot" (outline,
   * smaller, no icon in its only real usage so far). They are genuinely
   * different sizes in the real designs, not unified into one - see
   * Button.mdx Spec. */
  variant: 'primary' | 'secondary';
  onClick?: () => void;
  icon?: ReactNode;
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
