import wordmark from './assets/camels-wordmark.png';
import icon from './assets/camels-icon.png';
import './Logo.css';

export type LogoProps = {
  /** Which real exported variant to render. There is no combined lockup asset yet — see Logo.mdx Spec. */
  variant: 'icon' | 'wordmark';
  height?: number;
};

export function Logo({ variant, height = 32 }: LogoProps) {
  const src = variant === 'icon' ? icon : wordmark;
  return <img className="logo" src={src} alt="CAMELS" style={{ height }} />;
}
